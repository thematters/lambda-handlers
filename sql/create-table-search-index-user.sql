
-- drop & replace the table if exists
DROP TABLE IF EXISTS search_index.user ;

CREATE TABLE IF NOT EXISTS search_index.user AS
  SELECT id, user_name, lower(trim(leading '@＠ ' from display_name)) AS display_name,
    display_name AS display_name_orig,
    description, num_followers
  FROM public.user u
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers,
      MAX(created_at) AS latest_followed_at
    FROM action_user
    GROUP BY 1
  ) t ON target_id=u.id
  WHERE state IN ('active', 'onboarding')
  ORDER BY latest_followed_at DESC NULLS LAST, u.id DESC
  LIMIT 10000
;

ALTER TABLE search_index.user ADD PRIMARY KEY (id) ;
-- CREATE UNIQUE INDEX IF NOT EXISTS search_user_id_index ON search_index.user (id) ;

ALTER TABLE search_index.user ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT CURRENT_TIMESTAMP ;

CREATE UNIQUE INDEX IF NOT EXISTS search_user_name_index ON search_index.user (user_name) ;
CREATE INDEX IF NOT EXISTS search_user_display_name_index ON search_index.user (display_name) ;
CREATE INDEX IF NOT EXISTS search_user_display_name_orig_index ON search_index.user (display_name_orig) ;

