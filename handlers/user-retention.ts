import { Mail } from "../lib/mail.js";
import { processUserRetention } from "../lib/user-retention.js";

// const sgKey = process.env.SENDGRID_API_KEY || "";
const intervalInDays = process.env.USER_RETENTION_INTERVAL_IN_DAYS || '6';

// const mail = new Mail(sgKey)

export const handler = async (
  event: any,
) => {
  await processUserRetention({intervalInDays: +intervalInDays})
};
