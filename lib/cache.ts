import Redis from 'ioredis'

const cacheHost = process.env.MATTERS_CACHE_HOST || ''
const cachePort = parseInt(process.env.MATTERS_CACHE_PORT || '6379', 10)

interface KeyInfo {
  type?: string
  id?: string
  args?: { [key: string]: any }
  field?: string
}

export class Cache {
  redis: Redis

  constructor() {
    this.redis = new Redis(cachePort, cacheHost)
  }

  /**
   * Generate cache key.
   *
   * e.g. cache-objects:Article:1510
   */
  genKey = (prefix: string, { type, id, field, args }: KeyInfo): string => {
    const keys = [type, id, field, JSON.stringify(args)].filter((el) => el)
    if (keys.length === 0) {
      throw new Error('cache key not specified')
    }
    return [prefix, ...keys].join(':')
  }

  storeObject = ({
    key,
    data,
    expire,
  }: {
    key: string
    data: any
    expire: number
  }) => {
    const serializedData = JSON.stringify(data)
    return this.redis.set(key, serializedData, 'EX', expire)
  }

  removeObject = async ({ key }: { key: string }) => {
    await this.redis.del(key)
  }
}
