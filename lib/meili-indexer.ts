import { MeiliSearch } from "meilisearch";
import cheerio from "cheerio";
import Debug from "debug";

const debugLog = Debug("meili-indexer");
// import { OpenCC } from "opencc";
// import pkg from 'opencc'; const { OpenCC } = pkg;
// const OpenCC = require("opencc");
// import { converter } from "../lib/opencc.cjs";
// problems between tsconfig and Node-v18 ESM
import * as opencc from "opencc";
const OpenCC = (opencc as any).default;
console.log("imported opencc:", opencc, OpenCC);
const converter = new OpenCC("t2s.json");

// import { sql } from "../lib/db.js";

export interface Article {
  id: string;
  articleId: string;
  title: string;
  titleOrig?: string;
  slug: string;
  summary: string;
  content?: string;
  textContent?: string;
  textContentConverted?: string;
  createdAt: string | Date;
  numViews?: number;
}

// const meiliAdminKey = process.env.MEILI_ADMIN_KEY;

export class ArticlesIndexer {
  #meiliClient: MeiliSearch;
  // #converter: OpenCC;

  constructor(url: string, token: string) {
    this.#meiliClient = new MeiliSearch({
      host: url, // process.env.MEILI_SERVER_URL || "http://localhost:7700",
      apiKey: token, // meiliAdminKey, // "masterKey",
    });
    // this.#converter = new OpenCC("t2s.json");
  }

  async initIndexes() {
    const res = await Promise.all([
      this.#meiliClient
        .index("articles")
        .updateSortableAttributes(["createdAt", "numViews"]),

      this.#meiliClient.index("articles").updateRankingRules([
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
        // changed behavior
        "numViews:desc",
      ]),

      this.#meiliClient
        .index("articles")
        .updateFilterableAttributes(["articleId", "state", "publishState"]),

      this.#meiliClient.createIndex("articles", { primaryKey: "articleId" }),
    ]);

    debugLog("updateFilterableAttributes:", res);
  }

  async addToSearch(articles: Article[]) {
    await Promise.all(
      articles.map(async (arti, idx) => {
        const $ = cheerio.load(arti.content!);
        const text = $.text();
        arti.textContent = text;
        arti.titleOrig = arti.title;
        [arti.title, arti.textContentConverted] = await Promise.all([
          converter.convertPromise(arti.title.toLowerCase()),
          converter.convertPromise(text.toLowerCase()),
        ]);
        delete arti.content;
        debugLog(`article${idx}:`, arti);
      })
    );

    return this.#meiliClient.index("articles").addDocuments(articles);
  }
}

export const articlesIndexer = new ArticlesIndexer(
  process.env.MEILI_SERVER_URL || "http://localhost:7700",
  process.env.MEILI_ADMIN_KEY || ""
);
