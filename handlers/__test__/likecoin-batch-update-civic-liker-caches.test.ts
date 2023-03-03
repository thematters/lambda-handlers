import { Cache } from "../../lib/cache";
import { handler } from "../likecoin-batch-update-civic-liker-caches";

const getCivicLikerStatus = async (likerId: string) => {
  const cache = new Cache();
  return await cache.redis.get(cache.genKey("civic-liker", { id: likerId }));
};

test("wrong input", async () => {
  let res = await handler({} as any);
  expect(res.statusCode).toBe(400);

  res = await handler(["likerId"] as any);
  expect(res.statusCode).toBe(400);
  res = await handler([{}] as any);
  expect(res.statusCode).toBe(400);
  res = await handler([{ id: "likerId" }] as any);
  expect(res.statusCode).toBe(400);
  res = await handler([{ expires: 2 }] as any);
  expect(res.statusCode).toBe(400);
  res = await handler([{ id: "likerId", expires: "2" }] as any);
  expect(res.statusCode).toBe(400);
  res = await handler([{ id: "likerId", expires: 2 }, {}] as any);
  expect(res.statusCode).toBe(400);
});
test("good input", async () => {
  let res = await handler([]);
  expect(res.statusCode).toBe(200);
  res = await handler([{ id: "likerId", expires: 2 }]);
  expect(res.statusCode).toBe(200);

  expect(await getCivicLikerStatus("test_liker_id_2")).toBeNull();
  res = await handler([{ id: "test_liker_id_2", expires: 2 }]);
  expect(res.statusCode).toBe(200);
  expect(await getCivicLikerStatus("test_liker_id_2")).toBe("true");
});
