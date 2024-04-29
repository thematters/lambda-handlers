#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import { sql, ARRAY_TYPE } from '../lib/db.js'

// as same as https://github.com/thematters/matters-server/blob/develop/src/common/utils/nanoid.ts
import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

const nanoid = customAlphabet(ALPHABET, 12) // ~35 years or 308M IDs needed, in order to have a 1% probability of one collision // https://zelark.github.io/nano-id-cc/

const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE || '', 10) || 100

async function main() {
  const args = process.argv.slice(2)

  const rows =
    await sql`SELECT (short_hash IS NOT NULL) short_hash, COUNT(*) ::int FROM public.article GROUP BY 1 ;`
  console.log(new Date(), `get stats:`, rows)
  const noHashYet = rows.find((r) => r.shortHash === false)?.count
  if (!(noHashYet > 0)) {
    await alterSchemaNonNullable()
    return
  }

  const updated = await batchUpdateShortHashes(BATCH_SIZE)
  // if (updated === 0) // set non null at the end;
}

async function batchUpdateShortHashes(BATCH_SIZE = 100) {
  const started = Date.now()

  const rows = await sql`-- batch fill short-hash for article table
WITH last_batch AS (
  SELECT id, short_hash,
    ROW_NUMBER() OVER(ORDER BY id DESC) ::int seq
  FROM article
  WHERE short_hash IS NULL
  ORDER BY id DESC LIMIT ${BATCH_SIZE}
), last_batch_with_hash AS (
  SELECT id, cte.*
  FROM last_batch JOIN (
    SELECT *
    FROM UNNEST(
      ${sql.array(
        Array.from({ length: BATCH_SIZE }).map((_, seq) => seq + 1),
        ARRAY_TYPE
      )} ::int[],
      ${sql.array(
        Array.from({ length: BATCH_SIZE }).map(() => nanoid()),
        ARRAY_TYPE
      )} ::text[]
    ) AS t(seq, short_hash)
  ) cte USING(seq)
)

UPDATE article
SET short_hash=last_batch_with_hash.short_hash
FROM last_batch_with_hash
WHERE article.id=last_batch_with_hash.id
RETURNING article.* ; `

  const ended = new Date()
  console.log(
    ended,
    `filled ${rows.length} rows in ${+ended - started}ms: ${+(
      (rows.length / (+ended - started)) *
      1e3
    ).toFixed(1)} rows/sec`
    // rows.slice(0, 3)
  )

  return rows.length
}

async function alterSchemaNonNullable() {
  await sql`ALTER TABLE article ALTER COLUMN short_hash SET NOT NULL ; `
}

main().catch((err) => console.error(new Date(), 'ERROR:', err))
