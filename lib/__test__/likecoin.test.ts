import { LikeCoin } from "../likecoin";
import { Cache } from "../cache";

const likecoin = new LikeCoin();
const expire = 5;

const getCivicLikerStatus = async (likerId: string) => {
  const cache = new Cache();
  return JSON.parse(
    (await cache.redis.get(
      cache.genKey("civic-liker", { id: likerId })
    )) as string
  );
};

test("updateCivicLikerCaches", async () => {
  await likecoin.updateCivicLikerCaches({ civicLikerIds: [], expire });
  expect(await getCivicLikerStatus("test_liker_id_1")).toBeFalsy();

  await likecoin.updateCivicLikerCaches({
    civicLikerIds: ["not-matters-user-liker-id"],
    expire,
  });
  expect(await getCivicLikerStatus("test_liker_id_1")).toBeFalsy();

  await likecoin.updateCivicLikerCaches({
    civicLikerIds: ["test_liker_id_1"],
    expire,
  });
  expect(await getCivicLikerStatus("test_liker_id_1")).toBeTruthy();
  expect(await getCivicLikerStatus("test_liker_id_2")).toBeFalsy();

  await likecoin.updateCivicLikerCaches({ civicLikerIds: [], expire });
  expect(await getCivicLikerStatus("test_liker_id_1")).toBeFalsy();
  expect(await getCivicLikerStatus("test_liker_id_2")).toBeFalsy();
});
