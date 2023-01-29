import Redis from "ioredis";

const cacheHost = process.env.MATTERS_CACHE_HOST || "";
const cachePort = parseInt(process.env.MATTERS_CACHE_PORT || "6379", 10);

export class Cache {
  redis: Redis;

  constructor() {
    this.redis = new Redis(cachePort, cacheHost);
  }

  storeObject = ({
    key,
    data,
    expire,
  }: {
    key: string;
    data: any;
    expire: number;
  }) => {
    const serializedData = JSON.stringify(data);
    return this.redis.set(key, serializedData, "EX", expire);
  };

  removeObject = async ({ key }: { key: string }) => {
    await this.redis.del(key);
  };
}
