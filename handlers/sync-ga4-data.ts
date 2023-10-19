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
  data: {
    type: "today" | "yesterday";
  };
};

const getDate = (type: "today" | "yesterday") => {
  const date = new Date();
  if (type === "yesterday") {
    date.setDate(date.getDate() - 1);
  }
  return getLocalDateString(date);
};

export const handler = async (event: Event) => {
  const { type } = event.data;
  const startDate = getDate(type);
  const endDate = startDate;
  const data = await fetchGA4Data({ startDate, endDate });
  const convertedData = await convertAndMerge(data);
  await saveGA4Data(convertedData, { startDate, endDate });
};
