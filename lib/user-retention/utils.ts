import type { UserRetentionState, UserRetentionStateToMark } from './types'
import { sql } from '../db.js'

export const markUserState = async (
  userId: string,
  state: UserRetentionStateToMark
) => {
  await sql`INSERT INTO user_retention_history (user_id, state) VALUES (${userId}, ${state});`
}

export const loadUserRetentionState = async (
  userId: string
): Promise<UserRetentionState> => {
  const res = await sql`
    SELECT state, rank
    FROM
      (
        SELECT state, rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank
        FROM user_retention_history
        WHERE user_id=${userId}
      ) AS ranked
    WHERE rank=1`
  return res[0].state
}
