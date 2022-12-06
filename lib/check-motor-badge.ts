#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import { sql } from "../lib/db.js";

export async function checkMotorBadge(threshold = 100) {
  // const [{ version, now }] = await sql` SELECT VERSION(), NOW() `; console.log("pgres:", { version, now });

  // const args = process.argv.slice(2);
  // const threshold = Number.parseInt(args[0], 10) || 100;
  const items = await sql`-- transactions
SELECT user_name, display_name, t.*, user_badge.* -- , sender.id AS user_id, 'golden_motor' AS type
FROM (
  SELECT sender_id ::int, COUNT(*) ::int
  FROM transaction
  WHERE purpose='donation' AND state='succeeded'
  GROUP BY 1
  -- ORDER BY count DESC LIMIT 13
) t
LEFT JOIN public.user sender ON sender_id=sender.id
LEFT JOIN user_badge ON sender_id=user_badge.user_id AND user_badge.type='golden_motor'
WHERE user_badge.user_id IS NULL AND count >= ${threshold}
ORDER BY count DESC
-- LIMIT 13 ;`;
  console.log("items:", items);

  const shouldHaveMotorUsers = items
    .filter((item: any) => item.userId == null && item.count >= threshold)
    .map((item: any) => ({
      userId: item.senderId,
      type: "golden_motor",
    }));
  console.log(
    `checking threshold:${threshold} shouldHaveMotorUsers:`,
    shouldHaveMotorUsers
  );
  if (shouldHaveMotorUsers.length > 0) {
    const res = await sql`-- insert 'golden_motor'
INSERT INTO user_badge ${sql(shouldHaveMotorUsers)}
ON CONFLICT (user_id, type) DO NOTHING
RETURNING * ;`;
    console.log("insert new user badges result:", res);
  }
}

// main().catch((err) => console.error(new Date(), "ERROR:", err));
