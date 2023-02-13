import { refreshView } from "../refresh-view";

test("unexpected view", async () => {
  await expect(refreshView("fake-view")).rejects.toThrow();
});

test("expected view", async () => {
  await refreshView("tag_count_materialized");
});
