import { Mail } from "../lib/mail.js";
import { processUserRetention } from "../lib/user-retention";

// envs need to provide:
// PG_CONNECTION_STRING
// PGPASSWORD
// SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_NEW_FEATURE_TAG_ID;

const intervalInDays =
  parseInt(process.env.USER_RETENTION_INTERVAL_IN_DAYS as string, 10) || 5;

export const handler = async (event: any) => {
  await processUserRetention({ intervalInDays });
};
