import { invalidateFQC } from '@matters/apollo-response-cache'
import axios from 'axios'
import { Knex } from 'knex'

import { NODE_TYPE } from './constants/index.js'
import { pgKnex } from './db.js'
import { Cache } from './cache.js'

// ENV

const likecoinApiURL = process.env.MATTERS_LIKECOIN_API_URL || ''
const likecoinClientId = process.env.MATTERS_LIKECOIN_CLIENT_ID || ''
const likecoinClientSecret = process.env.MATTERS_LIKECOIN_CLIENT_SECRET || ''

// TYPE

type UserOAuthLikeCoinAccountType = 'temporal' | 'general'

type RequestProps = {
  endpoint: string
  method: 'GET' | 'POST'
  liker?: UserOAuthLikeCoin
  data?: any
  ip?: string
  userAgent?: string
  timeout?: number
}

interface UserOAuthLikeCoin {
  likerId: string
  accountType: UserOAuthLikeCoinAccountType
  accessToken: string
  refreshToken: string
  expires: Date
  scope: string | string[]
}

interface LikeData {
  likerId: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
  amount: number
}

interface SendPVData {
  likerId?: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
}

interface BaseUpdateCivicLikerCacheData {
  likerId: string
  expire: number
}

interface UpdateCivicLikerCacheData extends BaseUpdateCivicLikerCacheData {
  userId: string
  key: string
}

const ENDPOINT = {
  acccessToken: '/oauth/access_token',
  like: '/like/likebutton',
}

const ERROR_CODE = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  LOGIN_NEEDED: 'LOGIN_NEEDED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
}

export class LikeCoin {
  knex: Knex
  cache: Cache
  constructor() {
    this.knex = pgKnex
    this.cache = new Cache()
  }

  like = async (data: LikeData) => {
    const { likerId, url } = data
    const liker = await this.findLiker({ likerId })

    if (!liker) {
      throw new Error(`liker (${likerId}) not found.`)
    }

    if (url.startsWith('https://matters.news')) {
      await this.requestLike({
        liker,
        ...data,
        url: url.replace('https://matters.news', 'https://matters.town'),
      })
    } else {
      await this.requestLike({
        liker,
        ...data,
      })
    }
  }

  sendPV = async (data: SendPVData) => {
    const { likerId } = data
    const liker =
      likerId === undefined
        ? undefined
        : (await this.findLiker({ likerId })) || undefined

    await this.requestCount({
      liker: liker,
      ...data,
    })
  }

  updateCivicLikerCache = async ({
    likerId,
    userId,
    key,
    expire,
  }: UpdateCivicLikerCacheData) => {
    let isCivicLiker
    try {
      isCivicLiker = await this.requestIsCivicLiker({
        likerId,
      })
    } catch (e) {
      // remove from cache so new reqeust can trigger a retry
      await this.cache.removeObject({ key })
      throw e
    }

    const hour = 60 * 60
    await this._updateCivicLikerCache({
      likerId,
      userId,
      isCivicLiker,
      expire: expire + getRandomInt(1, hour),
    })
  }

  updateCivicLikerCaches = async (
    likerCacheData: BaseUpdateCivicLikerCacheData[]
  ) => {
    const likerIdToExpires = Object.fromEntries(
      likerCacheData.map(({ likerId, expire }) => [likerId, expire])
    )
    const mattersLikerData = await this.knex('user')
      .select('id', 'liker_id')
      .whereIn(
        'liker_id',
        likerCacheData.map(({ likerId }) => likerId)
      )
    await Promise.all(
      mattersLikerData.map(async ({ id, likerId }) => {
        const isCivicLiker = likerId in likerIdToExpires
        if (isCivicLiker) {
          this._updateCivicLikerCache({
            likerId,
            userId: id,
            isCivicLiker,
            expire: likerIdToExpires[likerId],
          })
        }
      })
    )
  }

  private _updateCivicLikerCache = async ({
    likerId,
    userId,
    isCivicLiker,
    expire,
  }: {
    likerId: string
    userId: string
    isCivicLiker: boolean
    expire: number
  }) => {
    // update cache
    await this.cache.storeObject({
      key: this.cache.genKey('civic-liker', { id: likerId }),
      data: isCivicLiker,
      expire,
    })

    // invalidation should after data update
    await invalidateFQC({
      node: { type: NODE_TYPE.User, id: userId },
      redis: { client: this.cache.redis },
    })
  }

  private requestLike = async ({
    authorLikerId,
    liker,
    url,
    likerIp,
    amount,
    userAgent,
  }: {
    authorLikerId: string
    liker: UserOAuthLikeCoin
    url: string
    likerIp?: string
    amount: number
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINT.like}/${authorLikerId}/${amount}`
    const result = await this.request({
      ip: likerIp,
      userAgent,
      endpoint,
      method: 'POST',
      liker,
      data: {
        referrer: encodeURI(url),
      },
    })
    const data = result?.data
    // filter CANNOT_SELF_LIKE error, self-like is allowed in Matters
    if (data === 'OK' || data === 'CANNOT_SELF_LIKE') {
      return data
    } else {
      throw result
    }
  }

  /**
   * current user like count of a content
   */
  private requestCount = async ({
    liker,
    authorLikerId,
    url,
    likerIp,
    userAgent,
  }: {
    liker?: UserOAuthLikeCoin
    authorLikerId: string
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINT.like}/${authorLikerId}/self`
    const res = await this.request({
      endpoint,
      method: 'GET',
      liker,
      ip: likerIp,
      userAgent,
      data: {
        referrer: encodeURI(url),
      },
    })
    const data = res?.data
    console.log('count response:', data)

    if (!data) {
      throw res
    }

    return data.count
  }

  private requestIsCivicLiker = async ({ likerId }: { likerId: string }) => {
    let res: any
    try {
      res = await this.request({
        endpoint: `/users/id/${likerId}/min`,
        method: 'GET',
        timeout: 2000,
      })
    } catch (e: any) {
      const code = e.response?.status as any
      if (code === 404) {
        console.warn(`likerId ${likerId} not exsit`)
        return false
      }
      throw e
    }
    console.log('civicLiker response:', res?.data)
    return !!res?.data?.isSubscribedCivicLiker
  }

  private request = async ({
    method,
    endpoint,
    liker,
    data,
    ip,
    userAgent,
    timeout,
  }: RequestProps) => {
    let accessToken = liker?.accessToken
    const makeRequest = () => {
      // Headers
      const headers = {} as any
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      if (ip) {
        headers['X-LIKECOIN-REAL-IP'] = ip
      }
      if (userAgent) {
        headers['X-LIKECOIN-USER-AGENT'] = userAgent
      }

      data = {
        ...data,
        client_id: likecoinClientId,
        client_secret: likecoinClientSecret,
      }
      const instance = axios.create({
        baseURL: likecoinApiURL,
        headers,
        timeout,
      })

      if (method === 'GET') {
        return instance.get(endpoint, {
          params: data,
        })
      } else {
        return instance.post(endpoint, data)
      }
    }

    let retries = 0
    while (retries < 2) {
      // call makeRequest at most twice
      try {
        return await makeRequest()
      } catch (e: any) {
        const err = e.response?.data as any

        switch (err) {
          case ERROR_CODE.TOKEN_EXPIRED:
          case ERROR_CODE.LOGIN_NEEDED:
            if (liker && retries++ < 1) {
              accessToken = await this.refreshToken({ liker })
              continue
            }
            break

          // notify client to prompt the user for reauthentication.
          // case ERROR_CODE.LOGIN_NEEDED: // was not re-trying
          case ERROR_CODE.INSUFFICIENT_PERMISSION:
            throw new Error(
              'token has no permission to access the resource, please reauth.'
            )
        }
        throw e
      }
    }
  }

  private refreshToken = async ({
    liker,
  }: {
    liker: UserOAuthLikeCoin
  }): Promise<string> => {
    const res = await this.request({
      endpoint: ENDPOINT.acccessToken,
      method: 'POST',
      data: {
        grant_type: 'refresh_token',
        refresh_token: liker.refreshToken,
      },
    })

    // update db
    const data = res?.data
    try {
      await this.knex('user_oauth_likecoin')
        .where({ likerId: liker.likerId })
        .update({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          scope: data.scope,
          updatedAt: this.knex.fn.now(), // new Date(),
        })
    } catch (e) {
      console.error(e)
    }

    return data.access_token
  }

  private findLiker = async ({
    likerId,
  }: {
    likerId: string
  }): Promise<UserOAuthLikeCoin | null> =>
    this.knex.select().from('user_oauth_likecoin').where({ likerId }).first()
}

const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

//const likecoin = new LikeCoin();
//(likecoin as any).requestIsCivicLiker({
//  likerId: "chiao22",
//});
