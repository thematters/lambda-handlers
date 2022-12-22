#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

// import postgres from "postgres";
// import { MeiliSearch } from "meilisearch";

import { dbApi, sql } from "../lib/db.js";
import { articlesIndexer, Article } from "../lib/meili-indexer.js";

async function main() {
  const args = process.argv.slice(2);
  const take = Number.parseInt(args[0], 10) || 5;
  const skip = Number.parseInt(args[1], 10) || 0;
  const range = args[2] || "1 year";

  await articlesIndexer.initIndexes();
  console.log("articlesIndexer.initIndexes");

  await sql.listen(
    "articles_feed",
    (x) => onNotify(JSON.parse(x)),
    async () =>
      await dbApi
        .listArticles({ take, skip, range })
        .cursor(10, processArticles)
  );

  /*
  const started = Date.now();
  let total = 0;
  for await (const articles of dbApi.listArticles({ take, skip }).cursor(10)) {
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
 */
}

async function onNotify(data: any) {
  console.log(new Date(), "updateOneArticle:", data);

  switch (data?.table_name) {
    case "draft": {
      const { article_id: articleId } = data.record;
      const articles = await dbApi.listArticles({
        articleIds: [articleId],
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
    case "article":
  }
}

async function processArticles(articles: Article[]) {
  const res = await articlesIndexer.addToSearch(articles);
  console.log(new Date(), `added ${articles.length} articles to search:`, res);
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
