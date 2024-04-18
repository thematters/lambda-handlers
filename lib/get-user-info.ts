import { sql } from '../lib/db.js'

export async function getUserInfo(userName: string, { year = 2022 } = {}) {
  const [user] =
    await sql`SELECT * FROM public.user WHERE user_name=${userName}`
  if (!user) {
    console.error(new Date(), 'not found:', user)
    throw new Error(`user not found`)
  }

  // const year = 2022;
  return sql`-- get user info
SELECT u.id ::int, user_name, display_name, u.created_at, ${year} ::int AS year,
  ('https://assets.matters.news/' || path) AS avatar, badges, u.eth_address,
  num_readings, num_writings,
  num_donated_articles, num_appreciated_articles,
  num_followed_authors,
  num_commented_articles, num_comments
FROM public.user u
LEFT JOIN asset ON type='avatar' AND avatar=asset.id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT article_id) ::int AS num_readings
  FROM article_read_count
  WHERE created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND user_id=${user.id}
  GROUP BY 1
) r ON r.user_id=u.id
LEFT JOIN (
  SELECT author_id, COUNT(id) ::int AS num_writings
  FROM article
  WHERE created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND state IN ('active')
    AND author_id=${user.id}
  GROUP BY 1
) a ON a.author_id=u.id
LEFT JOIN (
  SELECT sender_id, COUNT(DISTINCT target_id) ::int AS num_donated_articles
  FROM transaction
  WHERE state='succeeded' AND purpose='donation' AND target_type=4
    AND created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND sender_id=${user.id}
  GROUP BY 1
) t ON t.sender_id=u.id
LEFT JOIN (
  SELECT sender_id, COUNT(DISTINCT reference_id) ::int AS num_appreciated_articles
  FROM appreciation
  WHERE created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND sender_id=${user.id}
  GROUP BY 1
) appr ON appr.sender_id=u.id
LEFT JOIN (
  SELECT user_id, COUNT(DISTINCT target_id) ::int AS num_followed_authors
  FROM action_user
  WHERE action='follow'
    AND created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND user_id=${user.id}
  GROUP BY 1
) au ON au.user_id=u.id
LEFT JOIN (
  SELECT author_id,
    -- COUNT(DISTINCT article_id) ::int AS num_commented_articles,
    COUNT(DISTINCT target_id) ::int AS num_commented_articles, -- num_commented_target_articles,
    COUNT(*) ::int AS num_comments
  FROM comment
  WHERE created_at BETWEEN make_date(${year} ::int, 1, 1) AND make_date(${year} ::int+1, 1, 1) - interval '1 microsecond'
    AND author_id=${user.id}
  GROUP BY 1
) c ON c.author_id=u.id
LEFT JOIN (
  SELECT user_id, ARRAY_AGG(DISTINCT type) AS badges
  FROM user_badge
  GROUP BY 1
) b ON b.user_id=u.id
WHERE -- user_name=$ {userName}
  u.id=${user.id}
LIMIT 1 ;`
}
