import fs from "fs";

import { convertAndMerge, saveGA4Data } from "../lib/ga4.js";

// const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
// convertAndMerge(data).then(console.log);

saveGA4Data(
  { "3": 1, "2": 4 },
  { startDate: "2021-10-29", endDate: "2021-10-29" }
).then(console.log);

//fetchData({startDate: '2021-10-29', endDate: '2021-10-29'}).then(res => {
//	fs.writeFileSync('data.json', JSON.stringify(res, null, 2))
//});
