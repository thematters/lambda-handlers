
-- drop & replace the table if exists
DROP TABLE IF EXISTS search_index.tag ;

CREATE TABLE IF NOT EXISTS search_index.tag AS
  SELECT id, lower(trim(both '#＃ ' from content)) AS content, content AS content_orig, -- to be filled later with opencc conversion
    description, num_articles, num_authors, num_followers, last_followed_at
  FROM public.tag
  LEFT JOIN (
    SELECT target_id, COUNT(*) ::int AS num_followers,
      MAX(created_at) AS last_followed_at
    FROM action_tag
    GROUP BY 1
  ) actions ON target_id=tag.id
  LEFT JOIN (
    SELECT tag_id, COUNT(*) ::int AS num_articles, COUNT(DISTINCT author_id) ::int AS num_authors
    FROM article_tag JOIN article ON article_id=article.id AND article.state IN ('active')
    GROUP BY 1
  ) at ON tag_id=tag.id

  -- remove known duplicates from 'mat_views.tags_lasts'
  WHERE
    tag.id NOT IN ( SELECT UNNEST( array_remove(dup_tag_ids, id) ) FROM mat_views.tags_lasts WHERE ARRAY_LENGTH(dup_tag_ids,1)>1 )
    AND tag.id IN ( SELECT tag_id FROM article_tag WHERE age(created_at) <= '1 year' ::interval
          UNION ALL SELECT target_id FROM action_tag WHERE age(created_at) <= '1 year' ::interval )

  ORDER BY last_followed_at DESC NULLS LAST,
    -- tag.updated_at DESC,
    tag.id DESC

  LIMIT 10000 -- to avoid initialization time too long on Prod
;

ALTER TABLE search_index.tag ADD PRIMARY KEY (id) ;
-- CREATE UNIQUE INDEX IF NOT EXISTS search_tag_id_index ON search_index.tag (id) ;

ALTER TABLE search_index.tag ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT CURRENT_TIMESTAMP ;

CREATE INDEX IF NOT EXISTS search_tag_name_index ON search_index.tag (content) ;
 -- supposed to be Unique, but old table already has exact duplicates
CREATE INDEX IF NOT EXISTS search_tag_name_orig_index ON search_index.tag (content_orig) ;

