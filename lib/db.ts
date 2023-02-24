import { getKnexClient, getPostgresJsClient } from "./utils/db.js";

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

export const pgKnex = getKnexClient(databaseURL);
export const sql = getPostgresJsClient(databaseURL);

// read-only connection client

const databaseRoURL =
  process.env.MATTERS_PG_RO_CONNECTION_STRING ||
  "postgresql://no-exist@no-exist/no-exist";

export const pgKnexRO = getKnexClient(databaseRoURL);
export const sqlRO = getPostgresJsClient(databaseRoURL);

const pgSearchDatabaseURL =
  process.env.MATTERS_PG_SEARCH_CONNECTION_STRING ||
  "postgresql://no-exist@no-exist/no-exist";
export const sqlSIW = getPostgresJsClient(pgSearchDatabaseURL);

import { Article } from "../lib/pg-zhparser-articles-indexer.js";

export class DbApi {
  listArticles({
    articleIds,
    take = 5,
    skip = 0,
    // batchSize = 5,
    range = "1 week",
    orderBy = "lastRead",
  }: {
    articleIds?: string[];
    take?: number;
    skip?: number;
    // batchSize?: number;
    range?: string;
    orderBy?: "lastRead" | "seqDesc";
  } = {}) {
    console.log(new Date(), `listArticles:`, {
      articleIds,
      take,
      skip,
      // batchSize,
    });
    // const singleIdClause = articleId ? sql` (article_id=${articleId}) ` : sql``;
    const allRecentReadArticleIds = sql` ( SELECT DISTINCT article_id FROM article_read_count WHERE user_id IS NOT NULL AND created_at >= CURRENT_DATE - ${range} ::interval ) `;
    const allRecentPublishedArticles = sql` ( SELECT id FROM article WHERE state='active' AND created_at >= CURRENT_DATE - ${range} ::interval ) `;

    return sql<Article[]>`-- check articles from past week
SELECT a.*, num_views, extract(epoch from last_read_at) AS last_read_timestamp
FROM (
  SELECT -- draft.id,
    a.id, a.title, a.summary, -- a.slug, a.draft_id, a.summary,
    draft.content, draft.author_id, a.created_at -- , a.state, d.publish_state
  FROM article a JOIN draft ON draft_id=draft.id -- AND article_id=article.id
  WHERE state='active' AND publish_state='published'
    ${
      Array.isArray(articleIds)
        ? sql`AND a.id IN ${sql(articleIds)}`
        : range
        ? sql`AND a.id IN ( ${allRecentReadArticleIds} UNION ${allRecentPublishedArticles})`
        : sql``
    }
) a
LEFT JOIN (
  SELECT article_id, COUNT(*) ::int AS num_views,
    MAX(created_at) AS last_read_at
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) t ON article_id=a.id

ORDER BY ${orderBy === "lastRead" ? sql`last_read_at DESC NULLS LAST,` : sql``}
  a.id DESC
LIMIT ${take} OFFSET ${skip} ; `;
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

  listRecentUsers({
    take = 5,
    skip = 0,
    range = "1 week",
    orderBy = "seqDesc",
  }: {
    take?: number;
    skip?: number;
    range?: string;
    orderBy?: "lastFollowedAt" | "seqDesc";
  } = {}) {
    return sql`-- refresh table as view
SELECT id, user_name, display_name, description, state, created_at, num_followers, last_followed_at
FROM public.user u
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS last_followed_at
  FROM action_user
  GROUP BY 1
) t ON target_id=u.id
-- WHERE -- state IN ('active', 'onboarding')
  ${
    range
      ? sql`WHERE ( u.id IN ( SELECT DISTINCT target_id FROM action_user WHERE created_at <= CURRENT_DATE - ${range} ::interval ) OR u.updated_at >= CURRENT_DATE - ${range} ::interval )`
      : sql``
  }

ORDER BY ${
      orderBy === "lastFollowedAt"
        ? sql`last_followed_at DESC NULLS LAST,`
        : sql``
    }
  -- u.updated_at DESC,
  u.id DESC
LIMIT ${take} OFFSET ${skip} ;`;
  }

  listRecentTags({
    take = 5,
    skip = 0,
    range = "1 week",
    orderBy = "seqDesc",
  }: {
    take?: number;
    skip?: number;
    range?: string;
    orderBy?: "lastFollowedAt" | "seqDesc";
  } = {}) {
    const allRecentInUseTagIds = sql` (
            SELECT DISTINCT tag_id FROM article_tag WHERE created_at >= CURRENT_DATE - ${range} ::interval
      UNION SELECT DISTINCT target_id FROM action_tag WHERE created_at >= CURRENT_DATE - ${range} ::interval ) `;

    return sql`-- refresh table as view
SELECT id, content, description, created_at, num_articles, num_authors, num_followers, last_followed_at
FROM public.tag
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS last_followed_at
  FROM action_tag
  GROUP BY 1
) actions ON target_id=tag.id
LEFT JOIN (
  SELECT tag_id, COUNT(*) ::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
  FROM article_tag JOIN article ON article_id=article.id AND article.state IN ('active')
  GROUP BY 1
) at ON tag_id=tag.id

-- remove known duplicates from 'mat_views.tags_lasts'
WHERE
  tag.id NOT IN ( SELECT UNNEST( array_remove(dup_tag_ids, id) ) FROM mat_views.tags_lasts WHERE ARRAY_LENGTH(dup_tag_ids,1)>1 )
  ${
    range
      ? sql`AND ( tag.updated_at >= CURRENT_DATE - ${range} ::interval OR tag.id IN ( ${allRecentInUseTagIds} ) )`
      : sql``
  }

ORDER BY ${
      orderBy === "lastFollowedAt"
        ? sql`last_followed_at DESC NULLS LAST,`
        : sql``
    }
  -- tag.updated_at DESC,
  tag.id DESC

LIMIT ${take} OFFSET ${skip} ; `;
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
