import {
  fetchGA4Data,
  convertAndMerge,
  saveGA4Data,
  getLocalDateString,
} from "../lib/ga4.js";

// envs
// MATTERS_GA4_PROPERTY_ID;
// MATTERS_GA4_PROJECT_ID;
// MATTERS_GA4_CLIENT_EMAIL;
// MATTERS_GA4_PRIVATE_KEY;

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type Event = {
  type: "today" | "yesterday" | "2 days ago" | "3 days ago";
};

const getDate = (type: Event["type"]) => {
  const date = new Date();
  if (type === "yesterday") {
    date.setDate(date.getDate() - 1);
  } else if (type === "2 days ago") {
    date.setDate(date.getDate() - 2);
  } else if (type === "3 days ago") {
    date.setDate(date.getDate() - 3);
  }
  return getLocalDateString(date);
};

export const handler = async (event: Event) => {
  console.log("event: ", event);
  const startDate = getDate(event.type);
  const endDate = startDate;
  const data = await fetchGA4Data({ startDate, endDate });
  const convertedData = await convertAndMerge(data);
  await saveGA4Data(convertedData, { startDate, endDate });
};
