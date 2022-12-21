import { Mail } from "../lib/mail.js";
import { processUserRetention } from "../lib/user-retention.js";

// const sgKey = process.env.SENDGRID_API_KEY || "";
const intervalInDays = parseInt(process.env.USER_RETENTION_INTERVAL_IN_DAYS as string, 10) || 5 ;

// const mail = new Mail(sgKey)

export const handler = async (
  event: any,
) => {
  await processUserRetention({intervalInDays})
};
