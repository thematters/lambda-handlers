#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import { sql } from "../lib/db.js";
import { cfApi, cfApiThrottled } from "../lib/cloudflare-images.js";

import { RateLimitQueue, waitPromise } from "../lib/rate-queue.js";

// https://developers.cloudflare.com/fundamentals/api/reference/limits/
const CONCURRENCY = Math.trunc(Number(process.env.CONCURRENCY || 1200));
const q = new RateLimitQueue(CONCURRENCY, 300e3);

const stats = {
  assets: 0,
  fetched: 0,
  errors: 0,
  failed: 0,
  posted: 0,
  success: 0,
  retried: 0,
};

async function checkOne(path: string, createdAt?: Date, retries = 0) {
  /* try {
    const res = (await q.append(() =>
      cfApi.getImage({
        identifier: `prod/${path}`,
      })
    )) as Record<string, any>;
    console.log(
      new Date(),
      `asset in cf-images?: "${createdAt?.toISOString()}", "${
        res?.result?.id
      }" ${res?.result?.uploaded}`,
      res?.success || res?.errors
    );
    stats.fetched++;
    if (res?.success) return;
    else if (!res || res.errors) stats.errors++;
  } catch (err) {
    console.error(new Date(), "fetch ERROR:", err);
    stats.failed++;
  } */

  // let repost = 0; do {
  try {
    const res = (await q.append(() =>
      cfApi.postImage({
        url: `https://assets.matters.news/${path}`,
        identifier: `prod/${path}`,
      })
    )) as Record<string, any>;

    console.log(new Date(), "res:", res);
    console.log(
      new Date(),
      // `post asset in cf-images?: "${res.result.id}" ${res.success}: ${res.result.uploaded}`
      `post asset in cf-images?: "${path}" "${createdAt?.toISOString()}", "${
        res?.result?.id
      }" ${res?.result?.uploaded}`,
      res?.success || res?.errors
    );
    // if (res?.success) {
    stats.posted++;
    if (res?.success) stats.success++;
    return;
  } catch (err) {
    console.error(new Date(), "post ERROR:", err);
  }
  // } while (++repost < 1);

  // if (++retries <= 3) { await waitPromise((10 + 12 * Math.random()) * 1e3); q.append(() => checkOne(path, createdAt, retries)); }
  // stats.retried++;
}

async function main() {
  // const rows = await sql`SELECT VERSION(), CURRENT_TIMESTAMP`; console.log(new Date(), "rows:", rows);

  const args = process.argv.slice(2);

  const limit = Number.parseInt(args[0] ?? "1000", 10);
  const offset = Number.parseInt(args[1] ?? "0", 10);
  const range = args[2] ?? "1 month";

  const assets = sql`-- check latest assets
SELECT * FROM public.asset
${range ? sql`WHERE created_at <= CURRENT_DATE - ${range}::interval` : sql``}
ORDER BY id DESC
LIMIT ${limit} OFFSET ${offset}`.cursor(100);

  for await (const rows of assets) {
    // console.log(new Date(), "rows:", rows);
    stats.assets += rows.length;
    // await Promise.allSettled(
    rows.forEach(async (asset, idx) => {
      checkOne(asset.path, asset.createdAt);
    });
  }
}

const started = Date.now();
function handler(signal: string | number) {
  const now = new Date();
  console.log(
    now,
    "signal:",
    typeof signal,
    signal,
    stats,
    `in ${+((+now - started) / 60e3).toFixed(1)}min rate:`,
    +(stats.posted / ((+now - started) / 60e3)).toFixed(1)
  );
}
process.on("SIGINT", handler);
process.on("exit", handler);

main().catch((err) => console.error(new Date(), "ERROR:", err));
