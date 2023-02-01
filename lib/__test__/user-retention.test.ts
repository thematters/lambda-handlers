import { loadRecommendedArticles } from "../user-retention/sendmail";
import { DAY } from "../constants";

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
