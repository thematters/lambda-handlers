#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import process from "node:process";

import { dbApi, sql } from "../lib/db.js";
import {
  articlesIndexer,
  Article,
} from "../lib/pg-zhparser-articles-indexer.js";

const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE || "", 10) || 100;

const stats = {
  started: Date.now(),
  articles: 0,
};

async function main() {
  const args = process.argv.slice(2);

  let listenMode = false;
  while (args[0]?.startsWith("--")) {
    switch (args.shift()) {
      case "--listen":
        listenMode = true;
        break;
    }
  }

  const take = Number.parseInt(args[0] ?? 5, 10);
  const skip = Number.parseInt(args[1] ?? 0, 10);
  const range = args[2] ?? "1 year";

  const onListen = async () => {
    // console.log(new Date(), "listened:");
    await dbApi
      .listArticles({ take, skip, range, orderBy: "seqDesc" })
      .cursor(BATCH_SIZE, processArticles);
  };

  if (listenMode)
    await sql.listen("articles_feed", (x) => onNotify(JSON.parse(x)), onListen);
  else onListen();
}

async function onNotify(data: any) {
  console.log(new Date(), "updateOneArticle:", data);

  switch (data?.table_name) {
    case "article":
    case "draft": {
      const {
        id,
        article_id: articleId,
        draft_id: draftId,
        data_hash: dataHash,
        media_hash: mediaHash,
      } = data.record;
      if (!(articleId || draftId)) return; // neither article nor draft
      if (!(dataHash || mediaHash)) return; // no dataHash yet

      const articles = await dbApi.listArticles({
        articleIds: [articleId ?? id],
        take: 1,
      });
      console.log(
        new Date(),
        `listener got ${articles.length} articles:`,
        articles
      );
      processArticles(articles);
      break;
    }
  }
}

async function processArticles(articles: Article[]) {
  const res = await articlesIndexer.addToSearch(articles);
  stats.articles += articles.length;
  console.log(
    new Date(),
    `added ${articles.length} articles to search:`,
    articles.map(({ id, title, slug }) => `${id}-${slug ?? slugify(title)}`),
    res
  );
}

main().catch((err) => console.error(new Date(), "ERROR:", err));

// Using a single function to handle multiple signals
function handle(signal: string) {
  const now = new Date();
  console.log(
    now,
    `processed ${stats.articles} articles in ${+now - stats.started}ms.`,
    typeof signal,
    signal,
    stats
  );
  // console.log(`Received:`, typeof signal, signal, stats);
}

process.on("SIGINT", handle);
process.on("exit", handle);

// a simple slugify
function slugify(title: string) {
  return title.replaceAll(/[\s\p{P}]+/gu, "-").replaceAll(/(^-+|-+$)/g, "");
}
