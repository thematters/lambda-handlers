import { pgKnex as knex } from "./db.js";

export const refreshView = async (view: string) => {
  if (!Object.values(MATERIALIZED_VIEW).includes(view as any)) {
    throw Error(`Unexpected view name: ${view}`);
  }
  await knex.raw(/*sql*/ `
    refresh materialized view concurrently ${view}
  `);
};

enum MATERIALIZED_VIEW {
  // tag_count_materialized = "tag_count_materialized",
  user_reader_materialized = "user_reader_materialized",
  featured_comment_materialized = "featured_comment_materialized",
  // curation_tag_materialized = "curation_tag_materialized",
  article_hottest_materialized = "article_hottest_materialized",
  most_active_author_materialized = "most_active_author_materialized",
  most_appreciated_author_materialized = "most_appreciated_author_materialized",
  most_trendy_author_materialized = "most_trendy_author_materialized",
  user_activity_materialized = "user_activity_materialized",
  // recently_read_tags_materialized = "recently_read_tags_materialized",
  article_read_time_materialized = "article_read_time_materialized",
  recommended_articles_from_read_tags_materialized = "recommended_articles_from_read_tags_materialized",
}
