import { sql } from '../db.js'
import { markUserState } from './utils.js'

export const processUserRetention = async ({
  intervalInDays,
  sendmail,
}: {
  intervalInDays: number
  sendmail: any
}) => {
  await markNewUsers()
  await markActiveUsers()

  // fetch needed users data to check and change retention state
  console.time('fetchUsersData')
  const users = await fetchUsersData()
  console.timeEnd('fetchUsersData')
  console.log(`users num: ${users.length}`)

  const now = new Date()
  const intervalInMs = intervalInDays * 86400000
  console.log({ intervalInMs })

  console.time('loop')
  for (const { userId, state, stateUpdatedAt, lastSeen } of users) {
    const stateDuration = +now - +stateUpdatedAt
    if (lastSeen > stateUpdatedAt) {
      await markUserState(userId, 'NORMAL')
    } else if (stateDuration > intervalInMs) {
      switch (state) {
        case 'NEWUSER':
          await sendmail(userId, lastSeen, 'NEWUSER')
          break
        case 'ACTIVE':
          await sendmail(userId, lastSeen, 'ACTIVE')
          break
        case 'ALERT':
          await markUserState(userId, 'INACTIVE')
          break
      }
    }
    // else stateDuration < intervalInMs , do nothing
  }
  console.timeEnd('loop')
}

const markNewUsers = async () => {
  console.time('markNewUsers')
  await sql`
    INSERT INTO user_retention_history (user_id, state) 
    SELECT id, 'NEWUSER' FROM public.user 
    WHERE 
      created_at >= (CURRENT_TIMESTAMP - '2 day'::interval)
      AND id NOT IN (SELECT user_id FROM user_retention_history);`
  console.timeEnd('markNewUsers')
}

const markActiveUsers = async () => {
  // active users from exsited users
  console.time('markActiveUsers1')
  await sql`
    INSERT INTO user_retention_history (user_id, state)
    -- users read 0.1+ hours last 2 mouth
    SELECT user_id, 'ACTIVE'
      FROM article_read_count
      WHERE created_at > (CURRENT_TIMESTAMP - '60 days'::interval )
      GROUP BY user_id
      HAVING sum(read_time) >= 360 -- 0.1 hours
    -- users post 1+ articles last 2 mouth
    UNION SELECT author_id AS user_id, 'ACTIVE'
      FROM article
      WHERE created_at >= (CURRENT_TIMESTAMP - '60 days'::interval)
      GROUP BY author_id
      HAVING count(id) >= 1
    -- except marked users
    EXCEPT SELECT user_id, 'ACTIVE' 
      FROM user_retention_history;`
  console.timeEnd('markActiveUsers1')

  // active users from NORMAL, INACTIVE pool
  console.time('markActiveUsers2')
  await sql`
    -- helper table contains: users whose latest retention state are NORMAL / INACTIVE 
    WITH user_retention AS (
      SELECT ranked.user_id, ranked.state, ranked.created_at
      FROM (
        SELECT user_id, state, created_at, rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank FROM user_retention_history
      ) AS ranked
      WHERE ranked.rank = 1 AND ranked.state IN ('NORMAL', 'INACTIVE')
    )
    INSERT INTO user_retention_history (user_id, state)
    -- users whose latest retention state are NORMAL / INACTIVE 
    SELECT user_id, 'ACTIVE' FROM user_retention
    -- intersect users have enough activies since marked NORMAL / INACTIVE
    INTERSECT (
      SELECT article_read_count.user_id, 'ACTIVE'
        FROM article_read_count,user_retention
        WHERE 
          article_read_count.user_id=user_retention.user_id
          AND article_read_count.created_at >= user_retention.created_at
        GROUP BY article_read_count.user_id
        HAVING sum(read_time) >= 360 -- 0.1 hours
      UNION SELECT author_id AS user_id, 'ACTIVE'
        FROM article, user_retention
        WHERE 
          article.author_id = user_retention.user_id
          AND article.created_at >= user_retention.created_at
        GROUP BY article.author_id
        HAVING count(article.id) >= 1
    );`
  console.timeEnd('markActiveUsers2')
}

const fetchUsersData = async () => {
  return await sql`
    WITH user_retention AS (
      SELECT ranked.user_id, ranked.state, ranked.created_at 
      FROM (
        SELECT user_id, state, created_at, rank() OVER(PARTITION BY user_id ORDER BY id DESC) AS rank FROM user_retention_history
      ) AS ranked 
      WHERE ranked.rank = 1 AND ranked.state IN ('NEWUSER', 'ACTIVE', 'ALERT')
    )
    SELECT 
      user_id,
      user_retention.state,
      user_retention.created_at as state_updated_at,
      last_seen
    FROM user_retention, public.user
    WHERE user_retention.user_id = public.user.id;`
}

//processUserRetention({intervalInDays: 0}).then(()=>{process.exit()})
