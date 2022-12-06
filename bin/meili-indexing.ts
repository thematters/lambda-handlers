#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

// import postgres from "postgres";
// import { MeiliSearch } from "meilisearch";

import {
  dbApi,
  // sql
} from "../lib/db.js";
import { articlesIndexer, Article } from "../lib/meili-indexer.js";

async function main() {
  const started = Date.now();
  let total = 0;
  for await (const articles of dbApi.listArticles({ take: 150, skip: 0 })) {
    const res = await articlesIndexer.addToSearch(articles);
    console.log(
      new Date(),
      `added ${articles.length} articles to search:`,
      res
    );
    total += articles.length;
  }
  const ended = new Date();
  console.log(ended, `processed ${total} articles in ${+ended - started}ms.`);
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
