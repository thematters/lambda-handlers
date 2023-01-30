import { sendDailySummaryEmails } from "../lib/daily-summary-email/index.js";

// envs
// MATTERS_AWS_CLOUD_FRONT_ENDPOINT

export const handler = async (event: any) => {
  await sendDailySummaryEmails();
};
