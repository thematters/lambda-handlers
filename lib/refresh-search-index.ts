import { sql } from "../lib/db.js";
// import { PostgresError } from "postgres";
import postgres from "postgres";
import { pgKnex } from "../lib/db.js";

// import OpenCC from "opencc";
import * as opencc from "opencc";
const OpenCC = (opencc as any).default;
// console.log("imported opencc:", opencc, OpenCC);
const converter = new OpenCC("t2s.json");

/**
 * A typeguarded version of `instanceof Error` for NodeJS.
 * @author Joseph JDBar Barron
 * @link https://dev.to/jdbar
 */
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: Error,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof errorType;
}

// searchKey is a sample search key
export async function refreshSearchIndexUser({
  searchKey = "user",
  migrate = false,
  checkLastBatchSize = 1000,
  checkLastBatchOffset = 0,
  range = "1 month",
} = {}) {
  // const [{ version, now }] = await sql` SELECT VERSION(), NOW() `; console.log("pgres:", { version, now });

  let retries = 0;
  const migrateFunc = async () => {
    await sql.file("./sql/create-table-search-index-user.sql");
    retries++;
  };
  if (migrate) await migrateFunc();

  do {
    try {
      {
        /*
        const res = await pgKnex.raw( `? ON CONFLICT (id) DO UPDATE SET user_name = EXCLUDED.user_name, indexed_at = CURRENT_TIMESTAMP RETURNING * ;`,
          [
            pgKnex("search_index.user").insert([
              { id: 233, userName: "az111" },
              { id: 234, userName: "az112" },
            ]),
          ]
        );
        console.log(
          new Date(),
          `inserted (or updated) ${res.rowCount} items:`,
          res.rows
        );
      */
      }
      {
        const started = Date.now();

        const allUsers = sql`-- refresh table as view
-- REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.user ;

SELECT id, user_name, display_name,
  display_name AS display_name_orig,
  description, num_followers
FROM public.user u
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS latest_followed_at
  FROM action_user
  -- WHERE age(created_at) <= $ {range}::interval
  GROUP BY 1
) t ON target_id=u.id
WHERE state IN ('active', 'onboarding')
  AND u.id IN ( SELECT DISTINCT target_id FROM action_user WHERE age(created_at) <= ${range}::interval )

ORDER BY latest_followed_at DESC NULLS LAST, u.updated_at DESC
LIMIT ${checkLastBatchSize} OFFSET ${checkLastBatchOffset}
`;
        for await (const rows of allUsers.cursor(10)) {
          await Promise.all(
            rows.map(async (row) => {
              // row.userName = row.userName.toLowerCase();
              if (row.displayName)
                row.displayName = await converter.convertPromise(
                  row.displayName.toLowerCase()
                );
            })
          );

          console.log(new Date(), `prepared ${rows.length} items:`, rows);
          const res = await pgKnex.raw(
            `-- insert new users, or update
? ON CONFLICT (id) DO UPDATE SET user_name = EXCLUDED.user_name, display_name = EXCLUDED.display_name, num_followers = EXCLUDED.num_followers, indexed_at = CURRENT_TIMESTAMP
RETURNING * ;`,
            [pgKnex("search_index.user").insert(rows)]
          );

          // INSERT INTO search_index.user ${sql(rows)}
          // -- ON CONFLICT (id) DO UPDATE SET user_name = EXCLUDED.user_name, display_name = EXCLUDED.display_name, num_followers = EXCLUDED.num_followers, indexed_at = NOW()
          console.log(
            new Date(),
            `inserted (or updated) ${res.rowCount} items:`,
            res.rows
          );
        }
        const ended = new Date();
        const [{ count }] =
          await sql` SELECT COUNT(*) ::int FROM search_index.user ;`;
        console.log(
          new Date(),
          `refreshed search_index.user in ${
            +ended - started
          }ms, for ${count} users`
        );
      }
      {
        // const searchKey = "用戶名";
        const started = Date.now();
        const res = await sql`-- sample search
SELECT * FROM search_index.user
WHERE display_name ~* ${searchKey} OR user_name ~* ${searchKey}
ORDER BY (display_name = ${searchKey} OR user_name = ${searchKey}) DESC,
  num_followers DESC NULLS LAST
LIMIT 100 ;`;
        const ended = new Date();
        console.log(
          ended,
          `search (in ${+ended - started}ms) user got ${res.length} results:`,
          res
        );
      }
      break; // if succedeed
    } catch (err: any) {
      if (instanceOfNodeError(err, postgres.PostgresError)) {
        // 42P01	undefined_table; from https://www.postgresql.org/docs/current/errcodes-appendix.html
        if (err.code === "42P01") {
          await migrateFunc();
        }
      }

      console.error(
        new Date(),
        "refresh ERROR:",
        // typeof err,
        err.code,
        // Object.entries(err),
        err
      );
      break;
    }
  } while (retries <= 1);
}

// searchKey is a sample search key
export async function refreshSearchIndexTag({
  searchKey = "tag",
  migrate = false,
  checkLastBatchSize = 1000,
  checkLastBatchOffset = 0,
  range = "1 month",
} = {}) {
  // const [{ version, now }] = await sql` SELECT VERSION(), NOW() `; console.log("pgres:", { version, now });

  let retries = 0;
  const migrateFunc = async () => {
    await sql.file("./sql/create-table-search-index-tag.sql");
    retries++;
  };
  if (migrate) await migrateFunc();

  do {
    try {
      {
        const started = Date.now();
        const allTags = sql`-- refresh table as view
-- REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.tag ;

SELECT id, content, content AS content_orig, -- to be filled later with opencc conversion
  description, num_articles, num_authors, num_followers
FROM public.tag
LEFT JOIN (
  SELECT target_id, COUNT(*) ::int AS num_followers,
    MAX(created_at) AS latest_followed_at
  FROM action_tag
  -- WHERE age(created_at) <= $ {range}::interval
  GROUP BY 1
) actions ON target_id=tag.id
LEFT JOIN (
  SELECT tag_id, COUNT(*)::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
  FROM article_tag JOIN article ON article_id=article.id
  -- WHERE age(created_at) <= $ {range}::interval
  GROUP BY 1
) at ON tag_id=tag.id

-- remove known duplicates from 'mat_views.tags_lasts'
WHERE
  tag.id NOT IN ( SELECT UNNEST( array_remove(dup_tag_ids, id) ) FROM mat_views.tags_lasts WHERE ARRAY_LENGTH(dup_tag_ids,1)>1 )
  AND ( tag.id IN ( SELECT DISTINCT tag_id FROM article_tag WHERE age(created_at) <= $ {range}::interval )
     OR tag.id IN ( SELECT DISTINCT target_id FROM action_tag WHERE age(created_at) <= $ {range}::interval ) )

ORDER BY latest_followed_at DESC NULLS LAST, tag.updated_at DESC
LIMIT ${checkLastBatchSize} OFFSET ${checkLastBatchOffset}
; `;
        for await (const rows of allTags.cursor(10)) {
          await Promise.all(
            rows.map(async (row) => {
              row.content = await converter.convertPromise(
                row.content.toLowerCase()
              );
            })
          );
          /* const res = await sql`-- insert new tags, or update
INSERT INTO search_index.tag ${sql(rows)}
ON CONFLICT (id)
DO UPDATE SET
  content = EXCLUDED.content,
  num_followers = EXCLUDED.num_followers,
  indexed_at = NOW()
RETURNING * ;`; */
          const res = await pgKnex.raw(
            `? ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, num_followers = EXCLUDED.num_followers, indexed_at = CURRENT_TIMESTAMP RETURNING * ;`,
            [pgKnex("search_index.tag").insert(rows)]
          );
          console.log(
            new Date(),
            `inserted (or updated) ${res.rowCount} items:`,
            res.rows
          );
        }

        const ended = new Date();
        const [{ count }] =
          await sql` SELECT COUNT(*) ::int FROM search_index.tag ;`;
        console.log(
          new Date(),
          `refreshed search_index.tag in ${
            +ended - started
          }ms, for ${count} tags`
        );
      }

      {
        const started = Date.now();
        const res = await sql`-- sample search
SELECT * FROM search_index.tag
WHERE content ~* ${searchKey}
ORDER BY (content = ${searchKey}) DESC,
  num_articles DESC NULLS LAST
LIMIT 100 ;`;
        const ended = new Date();
        console.log(
          ended,
          `search (in ${+ended - started}ms) tag got ${res.length} results:`,
          res
        );
      }
      break; // if succedeed
    } catch (err: any) {
      if (instanceOfNodeError(err, postgres.PostgresError)) {
        // 42P01	undefined_table; from https://www.postgresql.org/docs/current/errcodes-appendix.html
        if (err.code === "42P01") {
          await migrateFunc();
        }
      }

      console.error(
        new Date(),
        "refresh ERROR:",
        // typeof err,
        err.code,
        // Object.entries(err),
        err
      );
      break;
    }
  } while (retries <= 1);
}
