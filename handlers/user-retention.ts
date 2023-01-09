import { Mail } from "../lib/mail.js";
import { processUserRetention } from "../lib/user-retention";

// envs need to provide:
// PG_CONNECTION_STRING
// PGPASSWORD
// SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_NEW_FEATURE_TAG_ID;
// MATTERS_USER_RETENTION_INTERVAL_IN_DAYS

const intervalInDays =
  parseInt(process.env.MATTERS_USER_RETENTION_INTERVAL_IN_DAYS as string, 10) || 5;

export const handler = async (event: any) => {
  const limit = event.limit;
  await processUserRetention({ intervalInDays, limit });
};
