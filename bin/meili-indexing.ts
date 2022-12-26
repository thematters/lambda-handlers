#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

// import postgres from "postgres";
// import { MeiliSearch } from "meilisearch";

import { dbApi, sql } from "../lib/db.js";
import { articlesIndexer, Article } from "../lib/meili-indexer.js";

const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE || "", 10) || 100;

async function main() {
  const args = process.argv.slice(2);
  const take = Number.parseInt(args[0] ?? 5, 10);
  const skip = Number.parseInt(args[1] ?? 0, 10);
  const range = args[2] ?? "1 year";

  await articlesIndexer.initIndexes();
  console.log("articlesIndexer.initIndexes");

  await sql.listen(
    "articles_feed",
    (x) => onNotify(JSON.parse(x)),
    async () =>
      await dbApi
        .listArticles({ take, skip, range, orderBy: "seqDesc" })
        .cursor(BATCH_SIZE, processArticles)
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
  console.log(
    new Date(),
    `added ${articles.length} articles to search:`,
    articles.map(({ articleId, slug }) => `${articleId}-${slug}`),
    res
  );
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
