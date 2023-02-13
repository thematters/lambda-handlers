import { randomUUID } from "crypto";
import { archiveUser } from "../archive-user";
import { USER_STATE } from "../archive-user/enum";
import { pgKnex as knex } from "../db";

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

test("can not archive active users", async () => {
  expect(warn).not.toHaveBeenCalled();
  await archiveUser("1");
  expect(warn).toHaveBeenCalled();
  warn.mockReset();
});

// helpers
const createArchiveUserData = async () => {
  const [user] = await knex("user").returning("id").insert({
    uuid: randomUUID(),
    user_name: "archived-user",
    display_name: "archived-user",
    description: "test user description",
    email: "active_uesr@matters.news",
    email_verified: true,
    state: USER_STATE.archived,
    mobile: "999",
  });
  return user;
};
