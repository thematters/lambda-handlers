#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import path from "node:path";
import shuffle from "lodash/shuffle.js";
import {
  // HomepageArticleDigest,
  HomepageContext,
  makeHomepage,
} from "@matters/ipns-site-generator";
import slugify from "@matters/slugify";

import {
  gw3Client,
  refreshPinLatest,
  refreshIPNSFeed,
} from "../lib/refresh-ipns-gw3.js";
import { AuthorFeed } from "../lib/author-feed-ipns.js";
import { ipfsPool } from "../lib/ipfs-servers.js";
import { dbApi, Item } from "../lib/db.js";

async function main() {
  const args = process.argv.slice(2);
  let mode: "publishIPNS" | "publishIPFS" | "uploadPinning" = "publishIPNS";

  switch (args?.[0]) {
    case "--publishIPNS":
    case "--publishIPFS":
    case "--uploadPinning":
      mode = args?.[0].substring(2) as any;
      args.shift();
      break;
  }

  if (mode === "publishIPFS") {
    const userName = args?.[0];
    const limit = parseInt(args?.[1] ?? "1");
    const offset = parseInt(args?.[2] ?? "0");

    const articles = await dbApi.listRecentArticlesToPublish({
      userName,
      take: limit,
      skip: offset,
    });
    const drafts = await dbApi.listDrafts({
      ids: articles.map((item: Item) => item.draftId as string),
      take: limit,
    });
    console.log(
      new Date(),
      `found ${articles.length} articles /${drafts.length} drafts not published:`,
      articles
    );

    const [author] = await dbApi.getAuthor(articles?.[0]?.userName as string);
    console.log(new Date(), "get author:", author);
    if (!author) {
      console.error(new Date(), "no such user.");
      return;
    }

    const [ipnsKeyRec] = await dbApi.getUserIPNSKey(author.id);
    console.log(new Date(), "get user ipns:", ipnsKeyRec);

    const feed = new AuthorFeed(
      author,
      ipnsKeyRec?.ipnsKey,
      drafts.slice(0, 1),
      articles.slice(0, 1)
    );

    // console.log(new Date(), "get author feed:", feed);
    await feed.loadData();

    console.log(
      new Date(),
      `found ${articles.length} articles to publish:`,
      articles
    );
    for (const draft of drafts.slice(0, 1)) {
      const res = await feed.publishToIPFS(draft);
      console.log(new Date(), `from published IPFS:`, res);
      if (!res) continue;
      const { contentHash, mediaHash, key } = res;
      const dbRes = await dbApi.updateArticleDataMediaHash(
        drafts[0].articleId,
        {
          dataHash: contentHash,
          mediaHash,
        }
      );
      console.log(new Date(), `from published IPFS, dbRes:`, dbRes);
    }
    return;
  } else if (mode === "uploadPinning") {
    const limit = parseInt(args?.[0] ?? "100");
    const offset = parseInt(args?.[1] ?? "0");
    await refreshPinLatest({ limit, offset });
    return;
  }

  let forceReplace = false;
  let useMattersIPNS: boolean | undefined;

  // publish IPNS mode
  console.log(new Date(), "running with:", args);
  switch (args?.[0]) {
    case "--forceReplace":
      forceReplace = true;
      args.shift();
      break;
    case "--useMattersIPNS":
    case "--useMattersIPNS=true":
      useMattersIPNS = true;
      args.shift();
      break;
    case "--useMattersIPNS=false":
      useMattersIPNS = false;
      args.shift();
      break;
  }

  // await testPinning();

  const userName = args?.[0];
  let limit = parseInt(args?.[1] || "50");

  let res = await refreshIPNSFeed(userName, {
    limit,
    forceReplace,
    useMattersIPNS,
  });
  console.log(new Date(), `refreshIPNSFeed res:`, res);
  if (res && res.missing <= res.limit / 10) return;

  if (res?.limit > 0) limit = res?.limit;

  if (limit > 10 && !((res?.missingInLast50 ?? res?.missing) === 0)) {
    // try again with limit: 10
    res = await refreshIPNSFeed(userName, {
      limit: 10,
      forceReplace,
      useMattersIPNS,
    });
    console.log(new Date(), `try again refreshIPNSFeed res:`, res);
  }
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
