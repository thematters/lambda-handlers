import { invalidateFQC } from "@matters/apollo-response-cache";
import axios, { AxiosRequestConfig, AxiosHeaders } from "axios";
import { Knex } from "knex";
import _ from "lodash";

import { pgKnex } from "./db.js";
import { Cache } from "./cache.js";

// ENV

const likecoinApiURL = process.env.MATTERS_LIKECOIN_API_URL || "";
const likecoinClientId = process.env.MATTERS_LIKECOIN_CLIENT_ID || "";
const likecoinClientSecret = process.env.MATTERS_LIKECOIN_CLIENT_SECRET || "";

// TYPE

type UserOAuthLikeCoinAccountType = "temporal" | "general";

type RequestProps = {
  endpoint: string;
  headers?: { [key: string]: any };
  liker?: UserOAuthLikeCoin;
  withClientCredential?: boolean;
  ip?: string;
  userAgent?: string;
} & AxiosRequestConfig;

interface UserOAuthLikeCoin {
  likerId: string;
  accountType: UserOAuthLikeCoinAccountType;
  accessToken: string;
  refreshToken: string;
  expires: Date;
  scope: string | string[];
}

interface LikeData {
  likerId: string;
  likerIp?: string;
  userAgent: string;
  authorLikerId: string;
  url: string;
  amount: number;
}

interface SendPVData {
  likerId?: string;
  likerIp?: string;
  userAgent: string;
  authorLikerId: string;
  url: string;
}

interface UpdateCivicLikerCacheData {
  likerId: string;
  userId: string;
  key: string;
  expire: number;
}

const ENDPOINT = {
  acccessToken: "/oauth/access_token",
  like: "/like/likebutton",
};

const ERROR_CODE = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  EMAIL_ALREADY_USED: "EMAIL_ALREADY_USED",
  OAUTH_USER_ID_ALREADY_USED: "OAUTH_USER_ID_ALREADY_USED",
  LOGIN_NEEDED: "LOGIN_NEEDED",
  INSUFFICIENT_PERMISSION: "INSUFFICIENT_PERMISSION",
};

export class LikeCoin {
  knex: Knex;
  constructor() {
    this.knex = pgKnex;
  }

  like = async (data: LikeData) => {
    const { likerId } = data;
    const liker = await this.findLiker({ likerId });

    if (!liker) {
      throw new Error(`liker (${likerId}) not found.`);
    }

    await this.requestLike({
      liker,
      ...data,
    });
  };

  sendPV = async (data: SendPVData) => {
    const { likerId } = data;
    const liker =
      likerId === undefined
        ? undefined
        : (await this.findLiker({ likerId })) || undefined;

    const result = await this.requestCount({
      liker: liker,
      ...data,
    });
  };

  updateCivicLikerCache = async ({
    likerId,
    userId,
    key,
    expire,
  }: UpdateCivicLikerCacheData) => {
    const cache = new Cache();
    let isCivicLiker;
    try {
      isCivicLiker = await this.requestIsCivicLiker({
        likerId,
      });
    } catch (e) {
      // remove from cache so new reqeust can trigger a retry
      await cache.removeObject({ key });
      throw e;
    }

    // update cache
    await cache.storeObject({
      key,
      data: isCivicLiker,
      expire,
    });

    // invalidation should after data update
    await invalidateFQC({
      node: { type: "User", id: userId },
      redis: { client: cache.redis },
    });
  };

  private requestLike = async ({
    authorLikerId,
    liker,
    url,
    likerIp,
    amount,
    userAgent,
  }: {
    authorLikerId: string;
    liker: UserOAuthLikeCoin;
    url: string;
    likerIp?: string;
    amount: number;
    userAgent: string;
  }) => {
    const endpoint = `${ENDPOINT.like}/${authorLikerId}/${amount}`;
    const result = await this.request({
      ip: likerIp,
      userAgent,
      endpoint,
      withClientCredential: true,
      method: "POST",
      liker,
      data: {
        referrer: encodeURI(url),
      },
    });
    const data = _.get(result, "data");
    if (data === "OK") {
      return data;
    } else {
      throw result;
    }
  };

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
    liker?: UserOAuthLikeCoin;
    authorLikerId: string;
    url: string;
    likerIp?: string;
    userAgent: string;
  }) => {
    const endpoint = `${ENDPOINT.like}/${authorLikerId}/self`;
    const res = await this.request({
      endpoint,
      method: "GET",
      liker,
      ip: likerIp,
      userAgent,
      withClientCredential: true,
      params: {
        referrer: encodeURI(url),
      },
    });
    const data = _.get(res, "data");

    if (!data) {
      throw res;
    }

    return data.count;
  };

  private requestIsCivicLiker = async ({ likerId }: { likerId: string }) => {
    const res = await this.request({
      endpoint: `/users/id/${likerId}/min`,
      method: "GET",
      timeout: 2000,
      // liker,
    });
    return !!_.get(res, "data.isSubscribedCivicLiker");
  };

  private request = async ({
    endpoint,
    liker,
    withClientCredential,
    ip,
    userAgent,
    headers = {},
    ...axiosOptions
  }: RequestProps) => {
    let accessToken = liker?.accessToken;
    const makeRequest = () => {
      // Headers
      if (accessToken) {
        (headers as AxiosHeaders).set("Authorization", `Bearer ${accessToken}`);
      }
      if (ip) {
        (headers as AxiosHeaders).set("X-LIKECOIN-REAL-IP", ip);
      }
      if (userAgent) {
        (headers as AxiosHeaders).set("X-LIKECOIN-USER-AGENT", userAgent);
      }

      // Params
      let params = {};
      if (withClientCredential) {
        if (axiosOptions.method === "GET") {
          params = {
            ...params,
            client_id: likecoinClientId,
            client_secret: likecoinClientSecret,
          };
        } else if (axiosOptions.data) {
          axiosOptions.data = {
            ...axiosOptions.data,
            client_id: likecoinClientId,
            client_secret: likecoinClientSecret,
          };
        }
      }

      return axios({
        url: endpoint,
        baseURL: likecoinApiURL,
        params,
        headers,
        ...axiosOptions,
      });
    };

    let retries = 0;
    while (retries < 2) {
      // call makeRequest at most twice
      try {
        return await makeRequest();
      } catch (e) {
        const err = _.get(e, "response.data") as any;

        switch (err) {
          case ERROR_CODE.TOKEN_EXPIRED:
          case ERROR_CODE.LOGIN_NEEDED:
            if (liker && retries++ < 1) {
              accessToken = await this.refreshToken({ liker });
              continue;
            }
            break;

          case ERROR_CODE.EMAIL_ALREADY_USED:
            throw new Error("email already used.");
          case ERROR_CODE.OAUTH_USER_ID_ALREADY_USED:
            throw new Error("user id already used.");

          // notify client to prompt the user for reauthentication.
          // case ERROR_CODE.LOGIN_NEEDED: // was not re-trying
          case ERROR_CODE.INSUFFICIENT_PERMISSION:
            throw new Error(
              "token has no permission to access the resource, please reauth."
            );
        }

        console.error(e);
        throw e;
      }
    }
  };

  private refreshToken = async ({
    liker,
  }: {
    liker: UserOAuthLikeCoin;
  }): Promise<string> => {
    const res = await this.request({
      endpoint: ENDPOINT.acccessToken,
      withClientCredential: true,
      method: "POST",
      data: {
        grant_type: "refresh_token",
        refresh_token: liker.refreshToken,
      },
    });

    // update db
    const data = _.get(res, "data");
    try {
      await this.knex("user_oauth_likecoin")
        .where({ likerId: liker.likerId })
        .update({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          scope: data.scope,
          updatedAt: this.knex.fn.now(), // new Date(),
        });
    } catch (e) {
      console.error(e);
    }

    return data.access_token;
  };

  private findLiker = async ({
    likerId,
  }: {
    likerId: string;
  }): Promise<UserOAuthLikeCoin | null> =>
    this.knex.select().from("user_oauth_likecoin").where({ likerId }).first();
}
