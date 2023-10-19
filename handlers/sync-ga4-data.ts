import { fetchGA4Data, convertAndMerge, saveGA4Data } from "../lib/ga4.js";

// envs

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type Event = {
  data: {
    type: "today" | "yesterday";
  };
};

// set timezone to UTC+8
process.env.TZ = "Asia/Taipei";

const getDate = (type: Event["data"]["type"]) => {
  const date = new Date();
  if (type === "yesterday") {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

export const handler = async (event: Event) => {
  const { type } = event.data;
  const date = getDate(type);
  const startDate = date.toISOString().slice(0, 10);
  const endDate = startDate;
  const data = await fetchGA4Data({ startDate, endDate });
  const convertedData = await convertAndMerge(data);
  await saveGA4Data(convertedData, { startDate, endDate });
};
