import fs from "fs";
import { fetchGA4Data, convertAndMerge, saveGA4Data } from "../lib/ga4.js";

const main = async () => {
  const startDate = "2021-10-15";
  const endDate = "2023-10-19";
  const data = await fetchGA4Data({ startDate, endDate });
  fs.writeFileSync("./data.json", JSON.stringify(data));
  const convertedData = await convertAndMerge(data);
  await saveGA4Data(convertedData, { startDate, endDate });
};

main();
