import cheerio from "cheerio";
import Debug from "debug";
import pkg from "../package.json" assert { type: "json" };

const debugLog = Debug("pg-zhparser-articles-indexer");

import * as opencc from "opencc";
const OpenCC = (opencc as any).default;
const converter = new OpenCC("t2s.json");

import { sqlSIW } from "../lib/db.js";

// https://www.atdatabases.org/docs/pg-bulk might be a better library on Bulk insert
// otherwise, the library is inferring some wrong type 25 on the PostgreSQL wire protocol
const ARRAY_TYPE = 1009;

export interface Article {
  id: string;
  articleId: string;
  title: string;
  titleOrig?: string;
  authorId: string | number;
  slug: string;
  summary: string;
  content?: string;
  textContent?: string;
  textContentConverted?: string;
  createdAt: Date | string;
  numViews?: number;
  lastReadAt?: Date;
}

export class ArticlesIndexer {
  async initIndexes() {
    debugLog("init zhparser indexes:");
  }

  async addToSearch(articles: Article[]) {
    await Promise.allSettled(
      articles.map(async (arti, idx) => {
        const $ = cheerio.load(arti.content!);
        const text = $.text();
        // arti.textContent = text;
        arti.titleOrig = arti.title;
        [arti.title, arti.summary, arti.textContentConverted] =
          await Promise.all([
            converter.convertPromise(arti.title.toLowerCase()),
            converter.convertPromise(arti.summary.toLowerCase()),
            converter.convertPromise(text.toLowerCase()),
          ]);
        delete arti.content;
        debugLog(`article${idx}:`, arti);
      })
    );

    // -- $ {zhParserDBSQL.array( ["367103", "367102", "367101", "367100", "367099"], 1009)} ::int[],
    // -- ARRAY['朝环任务〉环岛分享开启=］', '穆斯林的女儿', 'rooit 聊天交友 app 完整教学与真实评价！', '波尔图hostel的住客', 'rise of elves - best nft play to earn crypto games in 2023'] ::text[]
    const res = await sqlSIW`-- upsert refresh on target DB search_index.article
INSERT INTO search_index.article(id, title, author_id, summary, text_content_converted, num_views, created_at, last_read_at)
  SELECT * FROM UNNEST(
    ${sqlSIW.array(
      articles.map(({ id }) => id),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      articles.map(({ title }) => title),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      articles.map(({ authorId }) => authorId),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      articles.map(({ summary }) => summary),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      articles.map(
        ({ textContentConverted }) => textContentConverted
      ) as string[],
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      articles.map(({ numViews }) => numViews) as number[],
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      articles.map(({ createdAt }) =>
        (createdAt as Date)?.toISOString()
      ) as string[],
      ARRAY_TYPE
    )} ::timestamptz[],
    ${sqlSIW.array(
      articles.map(({ lastReadAt }) => lastReadAt?.toISOString()) as string[],
      ARRAY_TYPE
    )} ::timestamptz[]
  )
ON CONFLICT (id)
DO UPDATE
  SET title = EXCLUDED.title
    , summary = EXCLUDED.summary
    , author_id = EXCLUDED.author_id
    , text_content_converted = EXCLUDED.text_content_converted
    , num_views = EXCLUDED.num_views
    , created_at = EXCLUDED.created_at
    , indexed_at = CURRENT_TIMESTAMP

RETURNING * ;`;
    debugLog(
      new Date(),
      `inserted (or updated) ${res.length} items:`
      // res.map(({ id, userName }) => `/@${userName}-${id}`) // .rows
    );
  }
}

export const articlesIndexer = new ArticlesIndexer();
