import postgres from "postgres";
import knex from "knex";
import { knexSnakeCaseMappers } from "objection";
import pkg from "../package.json" assert { type: "json" };

export const pgKnex = knex({
  client: "pg",
  connection: process.env.PG_CONNECTION_STRING,
  pool: { min: 0, max: 2 },

  // searchPath: ["knex", "public"],
  ...knexSnakeCaseMappers(),
});

const databaseURL = process.env.PG_CONNECTION_STRING || "";
export const sql = postgres(databaseURL, {
  // idle_timeout: 300 for 5min, // auto end when idl'ing, use PGIDLE_TIMEOUT
  // connect_timeout: 10,
  // idle_timeout: 20,
  // max_lifetime: 60 * 30,

  // transform: postgres.toCamel,
  transform: {
    // ...postgres.camel,
    undefined: null,
    ...postgres.toCamel,
  },

  // types: { bigint: postgres.BigInt, },
  debug(connection, query, params, types) {
    console.log(`debug: query --:\n${query}\n`, { connection, params, types });
  },
  connection: {
    // TBD change to actual name of each app
    application_name: `${pkg.name}/${pkg.version}`, // "lambda-handlers-image:v2022-12-09", // 'postgres.js', // Default application_name
    // statement_timeout: 10e3,
    // connect_timeout: 10e3,
  },
});

import { Article } from "../lib/meili-indexer.js";

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
    const allArticleIds = sql` ( SELECT DISTINCT article_id FROM article_read_count WHERE user_id IS NOT NULL AND age(created_at) <= ${range} ::interval ) `;
    const allRecentArticles = sql` ( SELECT id FROM article WHERE state='active' AND age(created_at) <= ${range} ::interval ) `;

    return sql<Article[]>`-- check articles from past week
SELECT *, extract(epoch from last_read) AS last_read_timestamp
FROM (
  SELECT -- draft.id,
    draft.article_id, draft.title, article.slug, draft_id, draft.summary, draft.content, article.created_at, article.state, draft.publish_state
  FROM article JOIN draft ON draft_id=draft.id -- AND article_id=article.id
  WHERE state='active' AND publish_state='published'
    ${
      Array.isArray(articleIds)
        ? sql`AND article_id IN ${sql(articleIds)}`
        : range
        ? sql`AND article_id IN ( ${allArticleIds} UNION ${allRecentArticles})`
        : sql``
    }
) d
LEFT JOIN (
  SELECT article_id, COUNT(*) ::int AS num_views,
    MAX(created_at) AS last_read
  FROM article_read_count
  WHERE user_id IS NOT NULL
  GROUP BY 1
) t USING (article_id)

ORDER BY ${orderBy === "lastRead" ? sql`last_read DESC NULLS LAST,` : sql``}
  article_id DESC
LIMIT ${take} OFFSET ${skip} ; `;
  }

  listRecentAuthors({
    // limit = 5000,
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
SELECT id, user_name, display_name, description, num_followers, last_followed_at
FROM public.user u
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS last_followed_at
  FROM action_user
  GROUP BY 1
) t ON target_id=u.id
WHERE state IN ('active', 'onboarding')
  ${
    range
      ? sql`AND u.id IN ( SELECT DISTINCT target_id FROM action_user WHERE age(created_at) <= ${range} ::interval )`
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
    return sql`-- refresh table as view
SELECT id, content, description, num_articles, num_authors, num_followers, last_followed_at
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
      ? sql`AND tag.id IN ( SELECT DISTINCT tag_id FROM article_tag WHERE age(created_at) <= ${range} ::interval
        UNION SELECT DISTINCT target_id FROM action_tag WHERE age(created_at) <= ${range} ::interval )`
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
