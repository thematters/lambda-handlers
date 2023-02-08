import type { SendmailFn } from "../user-retention/types";
import { processUserRetention } from "../user-retention";
import { loadRecommendedArticles } from "../user-retention/sendmail";
import { markUserState, loadUserRetentionState } from "../user-retention/utils";
import { DAY } from "../constants";
import { sql } from "../db";

test("processUserRetention", async () => {
  // mark NEWUSER
  await processUserRetention({ intervalInDays: 1, sendmail: mockSendmail });
  const h1 = await getUserRetentionHistory("1");
  expect(h1.length).toBe(1);
  expect(h1[0].state).toBe("NEWUSER");
  // ALERT
  await processUserRetention({ intervalInDays: 0, sendmail: mockSendmail });
  const h2 = await getUserRetentionHistory("1");
  expect(h2.length).toBe(2);
  expect(h2[1].state).toBe("ALERT");
});

test("loadRecommendedArticles", async () => {
  const articles = await loadRecommendedArticles("2", getOldDate(), 3);
  expect(articles).toEqual([
    {
      id: "1",
      title: "test article 1",
      displayName: "test1",
      mediaHash: "someIpfsMediaHash1",
    },
  ]);
  // null lastSeen return nothing
  const articles2 = await loadRecommendedArticles("2", null as any as Date, 3);
  expect(articles2.length).toBe(0);
});

test("loadUserRetentionState", async () => {
  const userId = "3";
  await clearUserRetentionHistory();
  await markUserState(userId, "ALERT");
  expect(await loadUserRetentionState(userId)).toBe("ALERT");
  await markUserState(userId, "INACTIVE");
  expect(await loadUserRetentionState(userId)).toBe("INACTIVE");
});

// helpers

const mockSendmail: SendmailFn = async (userId, lastSeen, type) => {
  await markUserState(userId, "ALERT");
};
const getOldDate = () => new Date(+new Date() - DAY);
const getUserRetentionHistory = (userId: string) =>
  sql`SELECT * FROM user_retention_history WHERE user_id=${userId};`;

const clearUserRetentionHistory = () =>
  sql`DELETE FROM user_retention_history;`;
