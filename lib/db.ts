import { getKnexClient, getPostgresJsClient } from "./utils/db.js";

// main connection client

const CLOUDFLARE_IMAGE_ENDPOINT = process.env.CLOUDFLARE_IMAGE_ENDPOINT || "";
const MATTERS_AWS_S3_ENDPOINT = process.env.MATTERS_AWS_S3_ENDPOINT || "";

const dbHost = process.env.MATTERS_PG_HOST || "";
const dbUser = process.env.MATTERS_PG_USER || "";
const dbPasswd = process.env.MATTERS_PG_PASSWORD || "";
const dbName = process.env.MATTERS_PG_DATABASE || "";

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

// import { Article } from "../lib/pg-zhparser-articles-indexer.js";

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
  state: string;
  authorState: string;
  lastReadAt?: Date;
  userName?: string;
  dataHash?: string;
}

export interface Item {
  [key: string]: any;
  id: string;
}

export const IMAGE_ASSET_TYPE = {
  avatar: "avatar",
  cover: "cover",
  embed: "embed",
  profileCover: "profileCover",
  oauthClientAvatar: "oauthClientAvatar",
  tagCover: "tagCover",
  circleAvatar: "circleAvatar",
  circleCover: "circleCover",
  collectionCover: "collectionCover",
  announcementCover: "announcementCover",
  topicCover: "topicCover",
} as const;

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
    const allRecentChangedArticleIds = sqlRO` ( SELECT DISTINCT id FROM article WHERE updated_at >= CURRENT_DATE - ${range} ::interval ) `; // include state change
    const allRecentReadArticleIds = sqlRO` ( SELECT DISTINCT article_id FROM article_read_count WHERE user_id IS NOT NULL AND created_at >= CURRENT_DATE - ${range} ::interval ) `;
    const allRecentPublishedArticles = sqlRO` ( SELECT id FROM article WHERE created_at >= CURRENT_DATE - ${range} ::interval ) `; // this is actually included in allRecentChangedArticleIds

    return sqlRO<Article[]>`-- check articles from past week
SELECT * -- a.*, num_views, extract(epoch from last_read_at) AS last_read_timestamp
FROM (
  SELECT -- draft.id,
    a.id, a.title, a.summary, a.slug, a.draft_id, a.summary, a.data_hash, user_name,
    draft.content, draft.author_id, a.created_at, a.state, author.state AS author_state, draft.publish_state
  FROM article a JOIN draft ON draft_id=draft.id -- AND article_id=article.id
  LEFT JOIN public.user author ON author.id=draft.author_id
  WHERE
    ${
      Array.isArray(articleIds)
        ? sql`a.id IN ${sql(articleIds)}`
        : range
        ? sql`a.id IN ( ${allRecentChangedArticleIds} UNION ${allRecentReadArticleIds} UNION ${allRecentPublishedArticles} )`
        : sql`a.state='active' AND draft.publish_state='published'`
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

  listRecentArticles({ take = 100, skip = 0, state = ["active"] } = {}) {
    return sqlRO<[Item]>`-- list recent articles
SELECT article.id, slug, title, summary, data_hash, user_name
FROM public.article
LEFT JOIN public.user author ON author_id=author.id
WHERE article.state IN ('active') AND author.state NOT IN ('archived', 'bannded')
ORDER BY article.id DESC
LIMIT ${take} OFFSET ${skip} ;`;
  }
  listRecentArticlesToPublish({
    userName = "",
    take = 100,
    skip = 0,
    // state = ["active"],
  } = {}) {
    return sqlRO<[Item]>`-- list recent articles
SELECT article.id, article.slug, article.title, article.summary, article.data_hash, user_name, draft.content, draft.tags, draft_id, article_id
FROM public.article
LEFT JOIN public.draft ON article_id=article.id
LEFT JOIN public.user author ON article.author_id=author.id
WHERE article.state IN ('active') AND author.state NOT IN ('archived', 'banned')
  ${userName ? sqlRO`AND author.user_name IN (${userName})` : sqlRO``}
  AND publish_state IN ('published')
  AND article.data_hash IS NULL
ORDER BY article.id DESC
LIMIT ${take} OFFSET ${skip} ;`;
  }
  updateArticleDataMediaHash(
    id: number | string,
    { dataHash, mediaHash }: { dataHash: string; mediaHash: string }
  ) {
    return Promise.all([
      sql<[Item]>`
WITH cte AS ( SELECT id FROM public.article WHERE id IN (${id}) AND data_hash IS NULL AND media_hash IS NULL ORDER BY updated_at DESC LIMIT 1 )
UPDATE public.article a SET data_hash=${dataHash}, media_hash=${mediaHash}
FROM cte WHERE a.id=cte.id
RETURNING * ;`,
      sql<[Item]>`
WITH cte AS ( SELECT id FROM public.draft WHERE article_id IN (${id}) AND data_hash IS NULL AND media_hash IS NULL ORDER BY updated_at DESC LIMIT 1 )
UPDATE public.draft d SET data_hash=${dataHash}, media_hash=${mediaHash}
FROM cte WHERE d.id=cte.id
RETURNING * ;`,
    ]);
  }

  listAuthorArticles({
    authorId,
    take = 50,
    skip = 0,
    state = ["active"],
  }: {
    authorId: string | number;
    take?: number;
    skip?: number;
    state?: string[];
  }) {
    return sqlRO<
      [Item]
    >`SELECT * FROM public.article WHERE author_id=${authorId} AND state =ANY(${state}) ORDER BY id DESC LIMIT ${take} OFFSET ${skip};`;
  }
  listDrafts({
    ids,
    take = 50,
    skip = 0,
  }: {
    ids: string[];
    take?: number;
    skip?: number;
  }) {
    return sqlRO<
      [Item]
    >`SELECT * FROM public.draft WHERE id=ANY(${ids}) AND article_id IS NOT NULL AND publish_state IN ('published') ORDER BY article_id DESC LIMIT ${take} OFFSET ${skip};`;
  }

  listRecentAuthors({
    limit = 100,
    offset = 0,
    since = "2022-01-01",
  }: { limit?: number; offset?: number; since?: string | Date } = {}) {
    return sqlRO`-- check latest articles' author ipns_key
SELECT u2.user_name, u2.display_name, GREATEST(ul.last_at ::date, u2.last_seen ::date) AS last_seen,
  count_articles, ipns_key, last_data_hash AS top_dir_data_hash, last_published, a.*,
  concat('https://matters.town/@', u2.user_name, '/', a.id, '-', a.slug) AS last_article_url,
  priv_key_pem, priv_key_name
FROM (
  SELECT DISTINCT ON (author_id) author_id, id, title, slug, summary, data_hash AS last_article_data_hash, media_hash, created_at AS last_article_published
  FROM article
  WHERE state IN ('active')
    AND author_id NOT IN (SELECT user_id FROM user_restriction) -- skip restricted authors
  ORDER BY author_id, id DESC
) a
LEFT JOIN mat_views.users_lasts ul ON author_id=ul.id
LEFT JOIN public.user u2 ON author_id=u2.id
LEFT JOIN user_ipns_keys k ON author_id=k.user_id
LEFT JOIN (
  SELECT author_id, COUNT(*)::int AS count_articles
  FROM article
  WHERE state NOT IN ('archived')
  GROUP BY 1
) ta USING (author_id)
-- WHERE -- WHERE user_name IN ('Brianliu', '...', 'oldcat')
WHERE u2.state NOT IN ('archived', 'banned')
  AND a.last_article_published >= ${since}
  AND (last_published IS NULL OR last_published < a.last_article_published)
ORDER BY id DESC
LIMIT ${limit} OFFSET ${offset} `;
  }

  listRecentIPNSAuthors({
    skip = 10000,
    range = "1 year",
    userIds,
  }: { skip?: number; range?: string; userIds?: [string | number] } = {}) {
    return sqlRO`-- get authors' IPNS usage order
SELECT user_name, display_name, author.state AS author_state, author.last_seen, eth_address,
  ipns_key, last_data_hash,
  (author.state != 'active' OR author_id IN (SELECT user_id FROM user_restriction)) AS is_restricted,
  article.*, k.stats, GREATEST(author.last_seen, article.created_at) AS last_at
FROM (
  SELECT DISTINCT ON (author_id) author_id ::int,
    article.id ::int, title, state AS article_state, article.created_at
  FROM public.article
  ORDER BY author_id, id DESC
) article
LEFT JOIN public.user author ON author_id=author.id
LEFT JOIN public.user_ipns_keys k ON user_id=author.id
WHERE (stats->'isPurged')::bool IS NOT true
  -- AND author.last_seen >= CURRENT_DATE - $ {range}::interval
  ${Array.isArray(userIds) ? sqlRO`AND user_id=ANY(${userIds})` : sqlRO``}
  AND article.created_at >= CURRENT_DATE - ${range}::interval
ORDER BY last_at DESC NULLS LAST -- LIMIT 13000`;
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
    // const allRecentChangedUserIds = sql` ( SELECT DISTINCT id FROM public.user WHERE updated_at >= CURRENT_DATE - ${range} ::interval ) `; // include state change

    return sql`-- refresh table as view
SELECT id, user_name, display_name, description, state, created_at, num_followers, last_followed_at
FROM public.user u
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS last_followed_at
  FROM action_user
  GROUP BY 1
) t ON target_id=u.id
WHERE -- state IN ('active', 'onboarding')
  ${
    range
      ? sql`( u.id IN ( SELECT DISTINCT target_id FROM action_user WHERE created_at <= CURRENT_DATE - ${range} ::interval ) OR u.updated_at >= CURRENT_DATE - ${range} ::interval )`
      : sql`state IN ('active', 'onboarding')`
  }

ORDER BY ${
      orderBy === "lastFollowedAt"
        ? sql`last_followed_at DESC NULLS LAST,`
        : sql``
    }
  u.updated_at DESC,
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
    const allRecentInUseTagIds = sqlRO` (
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

  getAuthor(userName: string) {
    return sqlRO<
      [Item?]
    >`SELECT * FROM public.user WHERE user_name=${userName}`;
  }
  getUserIPNSKey(userId: string | number) {
    return sqlRO<
      [Item?]
    >`SELECT * FROM public.user_ipns_keys WHERE user_id=${userId}`;
  }
  async findAssetUrl(id: string | number, cf_variant = "public") {
    const [asset] = await sqlRO<
      [Item?]
    >`SELECT * FROM public.asset WHERE id=${id}`;
    if (!asset) return null;

    // genAssetUrl
    const isImageType = Object.values(IMAGE_ASSET_TYPE).includes(
      asset.type as any
    );
    return isImageType
      ? `${CLOUDFLARE_IMAGE_ENDPOINT}/${asset.path}/${cf_variant}` // this.cfsvc.genUrl(asset.path)
      : `${MATTERS_AWS_S3_ENDPOINT}/${asset.path}`;
  }
  updateUserIPNSKey(
    userId: string | number,
    stats: {
      lastDataHash?: string;
      lastPublished?: string | Date;
      [key: string]: any;
    },
    removeKeys: string[] = []
  ) {
    const {
      lastDataHash = null,
      lastPublished = null,
      isPurged,
      ...rest
    } = stats;
    return sql<[Item?]>`-- update ipns_keys entry
UPDATE public.user_ipns_keys
SET last_data_hash=${lastDataHash}, last_published=${lastPublished},
  stats=${
    isPurged
      ? null
      : sql`(COALESCE(stats, '{}' ::jsonb) - ${removeKeys} ::text[]) || ${
          rest as any
        } ::jsonb`
  },
  updated_at=CURRENT_TIMESTAMP
WHERE user_id=${userId} RETURNING * ;`;
  }
  upsertUserIPNSKey(
    userId: string | number,
    stats: {
      lastDataHash: string;
      lastPublished?: string | Date;
      [key: string]: any;
    },
    removeKeys: string[] = []
  ) {
    const {
      ipnsKey,
      privKeyPEM,
      pemName,
      lastDataHash,
      lastPublished,
      ...rest
    } = stats;
    return sql<[Item?]>`-- upsert new ipns record:
INSERT INTO public.user_ipns_keys AS k(user_id, ipns_key, priv_key_pem, priv_key_name, last_data_hash, last_published, stats)
VALUES(${userId}, ${ipnsKey}, ${privKeyPEM}, ${pemName}, ${lastDataHash}, ${
      lastPublished || null
    }, ${rest as any})
ON CONFLICT (user_id)
DO UPDATE SET
  last_data_hash=EXCLUDED.last_data_hash,
  last_published=EXCLUDED.last_published,
  stats=(COALESCE(k.stats, '{}' ::jsonb) - ${removeKeys} ::text[]) || EXCLUDED.stats,
  updated_at=CURRENT_TIMESTAMP
RETURNING * ;`;
  }

  queryArticlesByUuid(uuids: string[]) {
    return sqlRO` SELECT id, title, slug, data_hash, media_hash, created_at FROM article WHERE uuid =ANY(${uuids}) `;
  }

  async checkVersion() {
    const [{ version, now }] = await sqlRO` SELECT VERSION(), NOW() `;
    console.log("pgres:", { version, now });
  }
}

export const dbApi = new DbApi();
