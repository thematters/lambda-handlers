import { LikeCoin } from "../likecoin";
import { Cache } from "../cache";

const likecoin = new LikeCoin();
const expire = 1;

const getCivicLikerStatus = async (likerId: string) => {
  const cache = new Cache();
  return await cache.redis.get(cache.genKey("civic-liker", { id: likerId }));
};

test("updateCivicLikerCaches", async () => {
  await likecoin.updateCivicLikerCaches([]);
  expect(await getCivicLikerStatus("test_liker_id_1")).toBeNull();

  await likecoin.updateCivicLikerCaches([
    {
      likerId: "not-matters-user-liker-id",
      expire,
    },
  ]);
  expect(await getCivicLikerStatus("not-matters-user-liker-id")).toBeNull();

  await likecoin.updateCivicLikerCaches([
    {
      likerId: "test_liker_id_1",
      expire,
    },
  ]);
  expect(await getCivicLikerStatus("test_liker_id_1")).toBe("true");

  await likecoin.updateCivicLikerCaches([]);
  expect(await getCivicLikerStatus("test_liker_id_1")).toBe("true");
});
