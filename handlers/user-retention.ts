import { Mail } from "../lib/mail.js";
import { processUserRetention } from "../lib/user-retention/index.js";

// envs need to provide:
// PG_CONNECTION_STRING
// PGPASSWORD
// SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_NEW_FEATURE_TAG_ID;
// MATTERS_USER_RETENTION_INTERVAL_IN_DAYS

const intervalInDays =
  parseFloat(process.env.MATTERS_USER_RETENTION_INTERVAL_IN_DAYS as string) ||
  6;

export const handler = async (event: any) => {
  // console.log({ env: process.env });
  const limit = event.limit;
  await processUserRetention({ intervalInDays, limit });
};
