import { sql } from "../lib/db.js";

export const processUserRetention = async ({
  intervalInDays,
}: {
  intervalInDays: number;
}) => {
  await markNewUsers();
  await markActiveUsers();

  // fetch needed users data to check and change retention state
  const users = await fetchUsersData();

  const now = new Date();
  const intervalInMs = intervalInDays * 86400000;

  for (const { userId, state, stateUpdatedAt, lastSeen, email } of users) {
    const stateDuration = +now - +stateUpdatedAt;
    if (lastSeen > stateUpdatedAt) {
      console.log("update to NORMAL state");
      await markUserState(userId, "NORMAL");
    } else if (stateDuration > intervalInMs) {
      //TODO email generators
      switch (state) {
        case "NEWUSER":
          console.log("newuser");
          await markUserState(userId, "ALERT");
          break;
        case "ACTIVE":
          console.log("active user");
          await markUserState(userId, "ALERT");
          break;
        case "ALERT":
          console.log("alert user");
          await markUserState(userId, "INACTIVE");
          break;
      }
    }
    // else stateDuration < intervalInMs , do nothing
  }
};

const markUserState = async (
  userId: string,
  state: "NORMAL" | "ALERT" | "INACTIVE"
) => {
  await sql`INSERT INTO user_retention_history (user_id, state) VALUES (${userId}, ${state});`;
};

const markNewUsers = async () => {
  await sql`
    INSERT INTO user_retention_history (user_id, state) 
    SELECT id, 'NEWUSER' FROM public.user 
    WHERE 
      created_at >= (CURRENT_TIMESTAMP - '1 day'::interval)
      AND id NOT IN (SELECT id FROM user_retention_history);`;
};

const markActiveUsers = async () => {
  // active users from exsited users
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
      FROM user_retention_history;`;

  // active users from NORMAL, INACTIVE pool
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
    );`;
};

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
      last_seen,
      email 
    FROM user_retention, public.user
    WHERE user_retention.user_id = public.user.id;`;
};

//processUserRetention({intervalInDays: 0})
