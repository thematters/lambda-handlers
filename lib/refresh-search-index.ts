import cheerio from 'cheerio'
import postgres from 'postgres'

import { dbApi, sql, sqlSIW } from '../lib/db.js'

import createDebug from 'debug'

const debugLog = createDebug('search-index-user-tag')

import * as opencc from 'opencc'
const OpenCC = (opencc as any).default
const converter = new OpenCC('t2s.json')

const ARRAY_TYPE = 1009

const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE || '', 10) || 100

/**
 * A typeguarded version of `instanceof Error` for NodeJS.
 * @author Joseph JDBar Barron
 * @link https://dev.to/jdbar
 */
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: Error,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof errorType
}

// searchKey is a sample search key
export async function refreshSearchIndexUser({
  searchKey = 'user',
  migrate = false,
  checkLastBatchSize = 1000,
  checkLastBatchOffset = 0,
  range = '1 month',
} = {}) {
  let retries = 0
  const migrateFunc = async () => {
    await sql.file('./sql/create-table-search-index-user.sql')
    retries++
  }
  if (migrate) await migrateFunc()

  do {
    try {
      {
        const started = Date.now()

        let processed = 0
        for await (const rows of dbApi
          .listRecentUsers({
            take: checkLastBatchSize,
            skip: checkLastBatchOffset,
            range,
          })
          .cursor(BATCH_SIZE)) {
          await Promise.all(
            rows.map(async (row) => {
              row.userName = row.userName?.toLowerCase() || ''
              if (row.displayName) {
                row.displayNameOrig = row.displayName
                ;[row.displayName, row.description] = await Promise.all([
                  converter.convertPromise(
                    row.displayName?.toLowerCase() || ''
                  ),
                  row.description &&
                    converter.convertPromise(
                      row.description?.toLowerCase() || ''
                    ),
                ])
              }
            })
          )

          console.log(new Date(), `prepared ${rows.length} items:`, rows)
          const res = await sqlSIW`-- upsert new users
INSERT INTO search_index.user(id, user_name, display_name, display_name_orig, description, state, created_at, num_followers, last_followed_at) -- $ {sql(rows)}
  SELECT * FROM UNNEST(
    ${sqlSIW.array(
      rows.map(({ id }) => id),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ userName }) => userName),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ displayName }) => displayName),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ displayNameOrig }) => displayNameOrig),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ description }) => description),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ state }) => state),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ createdAt }) => createdAt?.toISOString()),
      ARRAY_TYPE
    )} ::timestamptz[],
    ${sqlSIW.array(
      rows.map(({ numFollowers }) => numFollowers),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ lastFollowedAt }) => lastFollowedAt?.toISOString()),
      ARRAY_TYPE
    )} ::timestamptz[]
  ) -- AS x(id, user_name, display_name, display_name_orig, description, num_followers, last_followed_at)
ON CONFLICT (id)
DO UPDATE
  SET user_name = EXCLUDED.user_name
    , display_name = EXCLUDED.display_name
    , display_name_orig = EXCLUDED.display_name_orig
    , description = EXCLUDED.description
    , state = EXCLUDED.state
    -- , created_at = EXCLUDED.created_at -- user's creation time
    , num_followers = EXCLUDED.num_followers
    , last_followed_at = EXCLUDED.last_followed_at
    , indexed_at = CURRENT_TIMESTAMP

RETURNING * ;`
          processed += res.length
          debugLog(
            new Date(),
            `inserted (or updated) ${res.length} (of ${processed}) items:`,
            res.map(({ id, userName }) => `/@${userName}, ${id}`) // .rows
          )
        }
        const ended = new Date()
        const [{ count }] =
          await sql` SELECT COUNT(*) ::int FROM search_index.user ;`
        console.log(
          new Date(),
          `refreshed search_index.user in ${
            +ended - started
          }ms, for ${count} users`
        )
      }
      {
        const started = Date.now()
        const res = await sqlSIW`-- sample search
SELECT * FROM search_index.user
WHERE display_name ~* ${searchKey} OR user_name ~* ${searchKey} OR plainto_tsquery('chinese_zh', ${searchKey}) @@ display_name_ts
ORDER BY (display_name = ${searchKey} OR user_name = ${searchKey}) DESC,
  num_followers DESC NULLS LAST, id ASC
LIMIT 100 ;`
        const ended = new Date()
        console.log(
          ended,
          `search (in ${+ended - started}ms) user got ${res.length} results:`,
          res
        )
      }
      break // if succedeed
    } catch (err: any) {
      if (instanceOfNodeError(err, postgres.PostgresError)) {
        // 42P01	undefined_table; from https://www.postgresql.org/docs/current/errcodes-appendix.html
        if (err.code === '42P01') {
          await migrateFunc()
        }
      }

      console.error(
        new Date(),
        'refresh ERROR:',
        // typeof err,
        err.code,
        // Object.entries(err),
        err
      )
      break
    }
  } while (retries <= 1)
}

// searchKey is a sample search key
export async function refreshSearchIndexTag({
  searchKey = 'tag',
  migrate = false,
  checkLastBatchSize = 1000,
  checkLastBatchOffset = 0,
  range = '1 month',
} = {}) {
  let retries = 0
  const migrateFunc = async () => {
    await sql.file('./sql/create-table-search-index-tag.sql')
    retries++
  }
  if (migrate) await migrateFunc()

  do {
    try {
      {
        const started = Date.now()

        for await (const rows of dbApi
          .listRecentTags({
            take: checkLastBatchSize,
            skip: checkLastBatchOffset,
            range,
          })
          .cursor(BATCH_SIZE)) {
          await Promise.all(
            rows.map(async (row) => {
              row.contentOrig = row.content
              ;[row.content, row.description] = await Promise.all([
                converter.convertPromise(row.content?.toLowerCase() || ''),
                // row.description &&
                converter.convertPromise(row.description?.toLowerCase() || ''),
              ])
            })
          )

          const res = await sqlSIW`-- insert new tags, or update
INSERT INTO search_index.tag(id, content, content_orig, description, created_at, num_articles, num_authors, num_followers, last_followed_at)
  SELECT * FROM UNNEST(
    ${sqlSIW.array(
      rows.map(({ id }) => id),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ content }) => content),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ contentOrig }) => contentOrig),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ description }) => description),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      rows.map(({ createdAt }) => createdAt?.toISOString()),
      ARRAY_TYPE
    )} ::timestamptz[],
    ${sqlSIW.array(
      rows.map(({ numArticles }) => numArticles),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ numAuthors }) => numAuthors),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ numFollowers }) => numFollowers),
      ARRAY_TYPE
    )} ::int[],
    ${sqlSIW.array(
      rows.map(({ lastFollowedAt }) => lastFollowedAt?.toISOString()),
      ARRAY_TYPE
    )} ::timestamptz[]
  ) -- AS x(id, content, content_orig, description, num_articles, num_authors, num_followers)
ON CONFLICT (id)
DO UPDATE SET
  content = EXCLUDED.content,
  content_orig = EXCLUDED.content_orig,
  description = EXCLUDED.description,
  -- createdAt...
  num_articles = EXCLUDED.num_articles,
  num_authors = EXCLUDED.num_authors,
  num_followers = EXCLUDED.num_followers,
  last_followed_at = EXCLUDED.last_followed_at,
  indexed_at = CURRENT_TIMESTAMP

RETURNING * ; `

          debugLog(
            new Date(),
            `inserted (or updated) ${res.length} items:`,
            res.map(({ id, contentOrig }) => `/${id}-${contentOrig}`)
          )
        }

        const ended = new Date()
        const [{ count }] =
          await sql` SELECT COUNT(*) ::int FROM search_index.tag ;`
        console.log(
          new Date(),
          `refreshed search_index.tag in ${
            +ended - started
          }ms, for ${count} tags`
        )
      }

      {
        const started = Date.now()
        const res = await sqlSIW`-- sample search
SELECT * FROM search_index.tag, plainto_tsquery('chinese_zh', ${searchKey}) query
WHERE content ~* ${searchKey} OR content_ts @@ query
ORDER BY (content = ${searchKey}) DESC,
  num_articles DESC NULLS LAST, id ASC
LIMIT 100 ;`
        const ended = new Date()
        console.log(
          ended,
          `search (in ${+ended - started}ms) tag got ${res.length} results:`,
          res
        )
      }
      break // if succedeed
    } catch (err: any) {
      if (instanceOfNodeError(err, postgres.PostgresError)) {
        // 42P01	undefined_table; from https://www.postgresql.org/docs/current/errcodes-appendix.html
        if (err.code === '42P01') {
          await migrateFunc()
        }
      }

      console.error(new Date(), 'refresh ERROR:', err.code, err)
      break
    }
  } while (retries <= 1)
}

interface Article {
  id: string
  articleId: string
  title: string
  titleOrig?: string
  authorId: string | number
  slug: string
  summary: string
  content?: string
  textContent?: string
  textContentConverted?: string
  createdAt: Date | string
  numViews?: number
  state: string
  authorState: string
  lastReadAt?: Date
  userName?: string
  dataHash?: string
}

// searchKey is a sample search key
export async function refreshSearchIndexArticle({
  checkLastBatchSize = 1000,
  checkLastBatchOffset = 0,
  range = '1 month',
} = {}) {
  for await (const articles of dbApi
    .listArticles({
      take: checkLastBatchSize,
      skip: checkLastBatchOffset,
      range,
      orderBy: 'seqDesc',
    })
    .cursor(BATCH_SIZE) as AsyncIterable<Article[]>) {
    console.log(`got ${articles.length} rows:`)
    await Promise.allSettled(
      articles.map(async (arti, idx) => {
        if (arti.state !== 'active') return // ignore archived, leave text to null reset

        const $ = cheerio.load(arti.content!)
        const text = $('body')
          .children('*')
          .toArray()
          .map((e) => $(e).text().trim())
          .filter(Boolean)
          .join('\n') // $.text();
        arti.titleOrig = arti.title
        ;[arti.title, arti.summary, arti.textContentConverted] =
          await Promise.all([
            converter.convertPromise(arti.title?.toLowerCase() || ''),
            converter.convertPromise(arti.summary?.toLowerCase() || ''),
            converter.convertPromise(text?.toLowerCase() || ''),
          ])
        delete arti.content
        debugLog(`article${idx}:`, arti)
      })
    )

    const res = await sqlSIW`-- upsert refresh on target DB search_index.article
INSERT INTO search_index.article(id, title, author_id, summary, text_content_converted, num_views, state, author_state, created_at, last_read_at)
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
      articles.map(({ state }) => state),
      ARRAY_TYPE
    )} ::text[],
    ${sqlSIW.array(
      articles.map(({ authorState }) => authorState),
      ARRAY_TYPE
    )} ::text[],
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
    , state = EXCLUDED.state
    , author_state = EXCLUDED.author_state
    -- , created_at = EXCLUDED.created_at
    , last_read_at = EXCLUDED.last_read_at
    , indexed_at = CURRENT_TIMESTAMP

RETURNING * ;`
    debugLog(new Date(), `inserted (or updated) ${res.length} items:`, res[0])
  }
}
