#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import util from "node:util";
import sharp from "sharp";

import { sqlRO } from "../lib/db.js";
import { cfApi, cfApiThrottled } from "../lib/cloudflare-images.js";

import { RateLimitQueue, waitPromise } from "../lib/rate-queue.js";

// https://developers.cloudflare.com/fundamentals/api/reference/limits/
const CONCURRENCY = Math.trunc(Number(process.env.CONCURRENCY || 100)); // of global 1200/5min
const q = new RateLimitQueue(CONCURRENCY, 300e3);

const stats: Record<string, number> = {
  assets: 0,
  // fetched: 0,
  errors: 0,
  failed: 0,
  posted: 0,
  success: 0,
  converted: 0, // with sharp
  unpublished: 0, // unpublished draft, no need to import
  missed: 0,
  headed: 0,
  existed: 0,
  // retried: 0,
  notAllowedTypes: 0,
};

// embedaudio
const allowedAssetTypes = new Set(
  `embed avatar cover profileCover tagCover collectionCover announcementCover circleCover circleAvatar oauthClientAvatar`
    .trim()
    .split(/\s+/)
);
// { code: 5455, message: 'Uploaded image must have image/jpeg, image/png, image/webp, image/gif or image/svg+xml content-type' }
// { code: 5411, message: "The Custom ID is invalid. Custom IDs can include 1024 characters or less, any number of subpaths, and support the UTF-8 encoding standard for characters. Enter a new Custom ID and try again: Must not use a non-image file name extension" }
// { code: 7011, message: 'Request entity is too large' }
// { code: 9422, message: 'error during decoding: Error while decoding WebP image. The file may be incomplete or damaged' }
const notAllowedFileTypes = /(bmp|txt|html|doc|mp3|mp4)$/i;
// const allowedFileTypes = /(jpe?g|png|webp|gif|svg)$/i;

const DIMENSION_LIMIT = 12e3, // maximum dimension allowed is 12000
  SIZE_LIMIT = 10 * 1024 * 1024;
async function sharpOne(
  buf: ArrayBuffer,
  quality = 82,
  drop = 2
): Promise<Buffer | undefined> {
  try {
    const image = await sharp(buf, { animated: false, failOn: "none" });
    const metadata = await image.metadata();
    console.log(new Date(), "metadata:", metadata);
    const { data, info } = await ((metadata.height as number) >
      DIMENSION_LIMIT || (metadata.width as number) > DIMENSION_LIMIT
      ? image.resize(DIMENSION_LIMIT, DIMENSION_LIMIT, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
      : image
    )
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    if (data.byteLength > SIZE_LIMIT) {
      return sharpOne(buf);
    }

    console.log(new Date(), `stop here and can upload:`, info, data);
    return data;
  } catch (err) {
    console.error(new Date(), `unexpected sharp ERROR:`, err);
  }
}

async function processOne(path: string, createdAt?: Date, retries = 0) {
  const resHead = await fetch(
    `https://cf-assets.matters.town/images/prod/${path}/public`,
    { method: "HEAD" }
  );
  stats.headed++;
  if (resHead.ok) {
    stats.existed++;
    return;
  }
  console.log(new Date(), `resHead:`, resHead);

  try {
    const resImport = (await q.append(() =>
      cfApi.postImage({
        url: `https://assets.matters.news/${path}`,
        identifier: `prod/${path}`,
        createdAt,
      })
    )) as Record<string, any>;

    // console.log(new Date(), "res:", res);
    console.log(
      new Date(),
      // `post asset in cf-images?: "${res.result.id}" ${res.success}: ${res.result.uploaded}`
      `post asset in cf-images?: "${path}" "${createdAt?.toISOString()}", "${
        resImport?.result?.id
      }" ${resImport?.result?.uploaded}`,
      resImport?.success || resImport?.errors
    );

    stats.posted++;
    if (resImport?.success) stats.success++;
    else if (Array.isArray(resImport?.errors)) {
      stats.errors++;
      console.error(
        `SKIPPED: migrate ERRORS:`,
        path,
        createdAt?.toISOString(),
        resImport.errors.length,
        util.inspect(resImport.errors[0], { breakLength: Infinity })
      );
      const resImage = await fetch(`https://assets.matters.news/${path}`);
      if (!resImage.ok) {
        console.error(new Date(), `error fetch asset:`, resImage);
        return;
      }
      console.log(
        new Date(),
        `fetch res:`,
        resImage.ok,
        resImage.status,
        resImage.statusText,
        resImage.headers,
        resImage
      );
      const buf = await sharpOne(await resImage.arrayBuffer());
      console.log(new Date(), `can upload now:`, buf);
      if (!buf) {
        return;
      }

      const resImageConverted = await cfApi.postImage({
        // url: `https://assets.matters.news/${path}`,
        identifier: `prod/${path}`,
        createdAt,
        file: buf,
      });

      console.log(new Date(), `fetch res:`, resImageConverted);
      if (resImageConverted.success === true) {
        console.log(new Date(), `converted:`, resImageConverted);
        stats.converted++;
      }
    } else {
      // all other unrecognizable failures
      stats.failed++;
    }
  } catch (err) {
    console.error(new Date(), "post ERROR:", err);
  }
}

async function main() {
  const args = process.argv.slice(2);

  while (args?.[0]?.startsWith("--")) {
    switch (args[0]) {
      case "--processOne":
        args.shift();
        const assets = await sqlRO`-- find asset
SELECT * FROM public.asset
LEFT JOIN public.asset_map ON asset_id=asset.id
LEFT JOIN public.entity_type ON entity_type_id=entity_type.id
WHERE path =ANY(${args}) ORDER BY asset.id DESC`;
        console.log(new Date(), `checking ${args.length} assets:`, assets);
        for (const ass of assets) {
          switch (ass.table) {
            case "draft": {
              // check draft publish status
              const [dr] = await sqlRO`-- get draft & article
SELECT draft.id, draft.title, draft.article_id, draft.publish_state, draft.created_at, draft.updated_at, article.state
FROM public.draft
LEFT JOIN public.article ON article_id=article.id
WHERE draft.id=${ass.entityId}`;
              console.log(new Date(), `related draft:`, dr);
              if (
                !(
                  dr?.articleId != null &&
                  dr?.publishState === "published" &&
                  dr?.state === "active"
                )
              ) {
                stats.unpublished++;
                continue;
              }
              break;
            }
            case "tag": {
              const [tag] =
                await sqlRO`SELECT * FROM public.tag WHERE id=${ass.entityId}`;
              console.log(new Date(), `related tag:`, tag);
              if (tag?.cover !== ass.assetId) continue;
              break;
            }
            case "user": {
              const [user] =
                await sqlRO`SELECT * FROM public.user WHERE id=${ass.entityId}`;
              console.log(new Date(), `related user:`, user);
              if (
                user?.state !== "active" ||
                user?.avatar !== ass.assetId ||
                user?.profileCover !== ass.assetId
              )
                continue;
              break;
            }
          }
          processOne(ass.path, ass.createdAt);
        }
        return;
    }
  }

  const limit = Number.parseInt(args[0] ?? "1000", 10);
  const offset = Number.parseInt(args[1] ?? "0", 10);
  const before = args[2] ?? "2021-01-01";

  // const rows = await sqlRO`SELECT VERSION(), CURRENT_TIMESTAMP`; console.log(new Date(), "rows:", rows);

  const assets = await sqlRO`-- list all assets
SELECT * FROM public.asset
LEFT JOIN public.asset_map ON asset_id=asset.id
LEFT JOIN public.entity_type ON entity_type_id=entity_type.id
WHERE created_at < ${before}
ORDER BY asset.id DESC LIMIT ${limit} OFFSET ${offset}`;
  console.log(new Date(), "got assets:", assets);
  const items = [];

  const m = new Map();
  const started = Date.now();
  for (const [idx, asset] of assets.entries()) {
    if (
      !allowedAssetTypes.has(asset.type) ||
      notAllowedFileTypes.test(asset.path) // || !allowedFileTypes.test(asset.path)
    ) {
      console.log(new Date(), `not allowed types:`, asset);
      console.error(
        `SKIPPED: media type or filename:`,
        util.inspect(asset, { breakLength: Infinity })
        // asset.path, asset.createdAt?.toISOString(), res.errors.length, util.inspect(res.errors[0], { breakLength: Infinity })
      );
      items.push(asset);
      stats.notAllowedTypes++;
      continue;
    }
    if (m.size >= 5) {
      const path = await Promise.race(m.values());
      m.delete(path);
    }

    m.set(
      asset.path,
      (async (idx, asset) => {
        try {
          const res = await fetch(
            // `https://imagedelivery.net/kDRCweMmqLnTPNlbum-pYA/prod/${asset.path}/public`,
            `https://cf-assets.matters.town/images/prod/${asset.path}/public`,
            { method: "HEAD" }
          );
          stats.headed++;
          if (res.ok) {
            stats.existed++;
            const t = new Date();
            const msg = `${t.toISOString()} ${((+t - started) / 60e3).toFixed(
              1
            )}min ${asset.createdAt.toISOString()} ${idx + 1} ${asset.type} ${
              asset.path
            }`;
            process.stdout.write(
              `\r${msg} ${".".repeat(Math.max(5, 100 - msg.length))}.`
            );
            return;
          }
          console.log(
            new Date(),
            `MISSED: ${asset.path} not ok res:`,
            res.ok,
            res.status,
            res.headers,
            res
          );
          stats.missed++;
          items.push(asset);

          processOne(asset.path, asset.createdAt);
        } catch (err) {
          console.error(new Date(), "ERROR:", err);
        } finally {
          return asset.path;
        }
      })(idx, asset)
    );
  }

  const itemsNonAudio = items.filter((item) => item.type !== "embedaudio");

  console.log(
    new Date(),
    `checked ${assets.length} assets between "${assets
      .at(0)
      ?.createdAt?.toISOString()
      ?.slice(0, 10)}:${assets
      .at(-1)
      ?.createdAt?.toISOString()
      ?.slice(0, 10)} {limit: ${limit}, offset: ${offset}}", found ${
      itemsNonAudio.length
    }(/${items.length}) TODO migrate:`,
    itemsNonAudio //items
  );
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
    // +(stats.posted / ((+now - started) / 60e3)).toFixed(1),
    +(stats.headed / ((+now - started) / 60e3)).toFixed(1)
  );
}
process.on("SIGINT", handler);
process.on("exit", handler);

main().catch((err) => console.error(new Date(), "ERROR:", err));
