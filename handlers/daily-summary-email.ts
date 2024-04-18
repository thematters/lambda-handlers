import { sendDailySummaryEmails } from '../lib/daily-summary-email/index.js'

// envs
// MATTERS_AWS_CLOUD_FRONT_ENDPOINT
// MATTERS_SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

export const handler = async (event: any) => {
  await sendDailySummaryEmails()
}
