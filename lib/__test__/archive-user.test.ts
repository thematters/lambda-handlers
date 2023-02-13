import { randomUUID } from "crypto";
import { archiveUser } from "../archive-user";
import { ARTICLE_STATE, PUBLISH_STATE, USER_STATE } from "../constants";
import { pgKnex as knex } from "../db";

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

test("can not archive active users", async () => {
  expect(warn).not.toHaveBeenCalled();
  await archiveUser("1");
  expect(warn).toHaveBeenCalled();
  warn.mockReset();
});

test("archive users not having data", async () => {
  const user = await createArchiveUserData({ hasData: false });
  await archiveUser(user.id);
  expect(warn).not.toHaveBeenCalled();
});

test("archive users having data", async () => {
  const user = await createArchiveUserData({ hasData: true });
  await archiveUser(user.id);
  expect(warn).not.toHaveBeenCalled();
});

// helpers

const createArchiveUserData = async ({
  hasData,
}: {
  hasData: boolean;
}): Promise<{ id: string }> => {
  const uuid = randomUUID();
  const [user] = await knex("user")
    .insert({
      uuid,
      user_name: "archived-user" + uuid.slice(0, 4),
      display_name: "archived-user",
      description: "test user description",
      email: uuid.slice(0, 4) + "@matters.news",
      state: USER_STATE.archived,
    })
    .returning("id");
  if (hasData) {
    const [unpublishedDraft, errorDraft, publishedDraft] = await knex("draft")
      .insert([
        {
          uuid: randomUUID(),
          author_id: user.id,
          title: "test draft 1",
          summary: "Some text of sumamry",
          content: "<div>some html string</div>",
          publish_state: PUBLISH_STATE.unpublished,
          tags: ["tag1", "tag2"],
        },
        {
          uuid: randomUUID(),
          author_id: user.id,
          title: "test draft 2",
          summary: "Some text of sumamry",
          content: "<div>some html string</div>",
          publish_state: PUBLISH_STATE.error,
        },
        {
          uuid: randomUUID(),
          author_id: user.id,
          title: "test draft 3",
          summary: "Some text of sumamry",
          content: "<div>some html string</div>",
          publish_state: PUBLISH_STATE.published,
        },
      ])
      .returning("id");
    const [errorArticle, publishedArticle] = await knex("article")
      .insert([
        {
          uuid: randomUUID(),
          author_id: user.id,
          draft_id: errorDraft.id,
          title: "error article",
          slug: "test-article-1",
          summary: "Some text",
          word_count: "1000",
          data_hash: "someIpfsDataHash1",
          media_hash: "someIpfsMediaHash1",
          content: "<div>some html string</div>",
          state: ARTICLE_STATE.error,
        },
        {
          uuid: randomUUID(),
          author_id: user.id,
          draft_id: publishedDraft.id,
          title: "published article",
          slug: "test-article-2",
          summary: "Some text",
          word_count: "1000",
          data_hash: "someIpfsDataHash2",
          media_hash: "someIpfsMediaHash2",
          content: "<div>some html string</div>",
          state: ARTICLE_STATE.active,
        },
      ])
      .returning("id");
    await knex("draft")
      .where("id", errorDraft.id)
      .update({ articleId: errorArticle.id });
  }
  return user;
};
