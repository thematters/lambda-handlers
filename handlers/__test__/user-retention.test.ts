import { handler } from "../user-retention";

test("run handler", async () => {
  await handler({ limit: 0 });
});
