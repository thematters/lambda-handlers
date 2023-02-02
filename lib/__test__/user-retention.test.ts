import { processUserRetention } from "../user-retention";
import { loadRecommendedArticles } from "../user-retention/sendmail";
import { DAY } from "../constants";
import { sql } from "../db";

test("processUserRetention", async () => {
  // mark NEWUSER
  await processUserRetention({ intervalInDays: 1 });
  const h1 = await getUserRetentionHistory("1");
  expect(h1.length).toBe(1);
  expect(h1[0].state).toBe("NEWUSER");
  // ALERT
  await processUserRetention({ intervalInDays: 0 });
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
});

// helpers

const getOldDate = () => new Date(+new Date() - DAY);
const getUserRetentionHistory = (userId: string) =>
  sql`SELECT * FROM user_retention_history WHERE user_id=${userId};`;
