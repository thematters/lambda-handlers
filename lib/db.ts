import { getKnexClient, getPostgresJsClient } from "./utils.js";

// main connection client

const isTest = process.env.MATTERS_ENV === "test";
const dbHost = process.env.MATTERS_PG_HOST || "";
const dbUser = process.env.MATTERS_PG_USER || "";
const dbPasswd = process.env.MATTERS_PG_PASSWORD || "";
const _dbName = process.env.MATTERS_PG_DATABASE || "";
const dbName = isTest ? "test_" + _dbName : _dbName;

const databaseURL =
  process.env.PG_CONNECTION_STRING ||
  `postgresql://${dbUser}:${dbPasswd}@${dbHost}:5432/${dbName}`;

console.log({ databaseURL });

export const pgKnex = getKnexClient(databaseURL);
export const sql = getPostgresJsClient(databaseURL);

// read-only connection client

const databaseRoURL =
  process.env.MATTERS_PG_RO_CONNECTION_STRING ||
  "postgresql://no-exist@no-exist/no-exist";

export const pgKnexRO = getKnexClient(databaseRoURL);
export const sqlRO = getPostgresJsClient(databaseRoURL);

import { Article } from "../lib/meili-indexer.js";

export class DbApi {
  listArticles({
    articleIds,
    take = 5,
    skip = 0,
    batchSize = 5,
    range = "1 week",
  }: {
    articleIds?: string[];
    take?: number;
    skip?: number;
    batchSize?: number;
    range?: string;
  } = {}) {
    console.log(new Date(), `listArticles:`, {
      articleIds,
      take,
      skip,
      batchSize,
    });
    // const singleIdClause = articleId ? sql` (article_id=${articleId}) ` : sql``;
    const allArticleIds = sql` ( SELECT DISTINCT article_id FROM article_read_count WHERE user_id IS NOT NULL AND age(created_at) <= ${range}::interval ) `;
    const allRecentArticles = sql` ( SELECT id FROM article WHERE state='active' AND age(created_at) <= ${range}::interval ) `;

    return sql<Article[]>`-- check articles from past week
SELECT *
FROM (
  SELECT draft.id, draft.article_id, draft.title, article.slug, draft.summary, draft.content, draft.created_at, article.state, draft.publish_state
  FROM draft JOIN article ON article_id=article.id AND article_id IS NOT NULL
  WHERE state='active' AND publish_state='published'
    AND
      ${
        Array.isArray(articleIds)
          ? sql`article_id IN ${sql(articleIds)}`
          : sql`article_id IN ( ${allArticleIds} UNION ALL ${allRecentArticles})`
      }
) d
LEFT JOIN (
  SELECT article_id, COUNT(*)::int AS num_views
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) t USING (article_id)
ORDER BY article_id DESC
LIMIT ${take} OFFSET ${skip}
`; // .cursor(batchSize);
  }

  listRecentAuthors({
    limit = 5000,
    since = "2022-01-01",
  }: { limit?: number; since?: string | Date } = {}) {
    return sql`-- check latest articles' author ipns_key
SELECT u2.user_name, u2.display_name, COALESCE(u.last_at ::date, CURRENT_DATE) AS last_seen,
  count_articles, ipns_key, last_data_hash AS top_dir_data_hash, last_published AS last_refreshed, t.*,
  concat('https://matters.news/@', u2.user_name, '/', t.id, '-', t.slug) AS last_article_url,
  priv_key_pem, priv_key_name
FROM (
  SELECT DISTINCT ON (author_id) author_id, id, title, slug, data_hash AS last_article_data_hash, media_hash, created_at AS last_article_published
  FROM article
  WHERE state NOT IN ('archived', 'banned')
  ORDER BY author_id, id DESC
) t
LEFT JOIN mat_views.users_lasts u ON author_id=u.id
LEFT JOIN public.user u2 ON author_id=u2.id
LEFT JOIN user_ipns_keys k ON author_id=k.user_id
LEFT JOIN (
  SELECT author_id, COUNT(*)::int AS count_articles
  FROM article
  WHERE state NOT IN ('archived')
  GROUP BY 1
) ta USING (author_id)
-- WHERE u.state NOT IN ('archived')
-- WHERE user_name IN ('Brianliu', '...', 'oldcat')
WHERE t.last_article_published >= ${since}
ORDER BY id DESC
-- OFFSET floor(RANDOM() * 100 + 1)::int
-- LIMIT 5000 `;
  }

  queryArticlesByUuid(uuids: string[]) {
    return sql` SELECT id, title, slug, data_hash, media_hash, created_at FROM article WHERE uuid =ANY(${uuids}) `;
  }

  async checkVersion() {
    const [{ version, now }] = await sql` SELECT VERSION(), NOW() `;
    console.log("pgres:", { version, now });
  }
}

export const dbApi = new DbApi();
