import { sql } from "../lib/db.js";
// import { PostgresError } from "postgres";
import postgres from "postgres";

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
export async function refreshSearchIndexUser(
  searchKey = "user",
  reCreate = false
) {
  // const [{ version, now }] = await sql` SELECT VERSION(), NOW() `; console.log("pgres:", { version, now });

  let retries = 0;
  const migrate = async () => {
    await sql.file("./sql/create-materialized-view-search-index-user.sql");
    retries++;
  };
  if (reCreate) await migrate();

  do {
    try {
      {
        const started = Date.now();
        await sql`-- refresh view
REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.user ;`;
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
WHERE display_name ~ ${searchKey} OR user_name ~ ${searchKey}
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
          await migrate();
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
export async function refreshSearchIndexTag(
  searchKey = "tag",
  reCreate = false
) {
  const [{ version, now }] = await sql` SELECT VERSION(), NOW() `;
  console.log("pgres:", { version, now });

  let retries = 0;
  const migrate = async () => {
    await sql.file("./sql/create-materialized-view-search-index-tag.sql");
    retries++;
  };
  if (reCreate) await migrate();

  do {
    try {
      {
        const started = Date.now();
        await sql`-- refresh view
REFRESH MATERIALIZED VIEW CONCURRENTLY search_index.tag ;`;
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
WHERE content ~ ${searchKey}
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
          await migrate();
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
