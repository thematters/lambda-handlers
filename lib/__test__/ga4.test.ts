import { pgKnex as knex } from "../db";
import {
  saveGA4Data,
  TABLE_NAME,
  getLocalDateString,
  convertAndMerge,
} from "../ga4";

test("saveGA4Data", async () => {
  const startDate = "2021-01-01";
  const endDate = "2021-01-01";

  // insert
  await saveGA4Data({ "1": 1, "2": 2 }, { startDate, endDate });

  const rows = await knex(TABLE_NAME)
    .select("*")
    .where({ dateRange: `[${startDate}, ${endDate}]` });
  expect(rows.length).toBe(2);

  // insert and update
  await saveGA4Data({ "1": 2, "3": 3 }, { startDate, endDate });

  const rows2 = await knex(TABLE_NAME)
    .select("*")
    .where({ dateRange: `[${startDate}, ${endDate}]` });
  expect(rows2.length).toBe(3);
  for (const row of rows2) {
    if (row.articleId === "1") {
      expect(row.totalUsers).toBe("2");
    }
  }
});

test("getLocalDateString", async () => {
  const date = new Date("2021-01-01");
  const dateStr = getLocalDateString(date);
  expect(dateStr).toBe("2021-01-01");
});

test("convertAndMerge", async () => {
  const data = [
    {
      path: "/@zeck_test_10/1-未命名-bafybeiggtv7fcj5dci5x4hoogq7wzutortc3z2jyrsfzgdlwo7b4wjju4y",
      totalUsers: "5",
    },
    { path: "/@alice_at_dev", totalUsers: "1" },
    {
      path: "/@alice_at_dev/21094-amet-fugiat-commodo-pariatur-bafybeiffgowmxvnmdndqqptvpstu4a425scomyvh37koxy3ifind643sne",
      totalUsers: "1",
    },
    { path: "/@bob_at_dev", totalUsers: "1" },
  ];
  const result = await convertAndMerge(data);
  expect(result).toStrictEqual({
    "1": 5,
  });
});
