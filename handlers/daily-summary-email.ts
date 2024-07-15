import { sendDailySummaryEmails } from '../lib/daily-summary-email/index.js'
import { getKnexClient } from '../lib/utils/db.js'

// envs
// MATTERS_AWS_CLOUD_FRONT_ENDPOINT
// MATTERS_SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_SITE_NAME

const knexRO = getKnexClient(process.env.MATTERS_PG_RO_CONNECTION_STRING || '')

export const handler = async (event: any) => {
  await sendDailySummaryEmails(knexRO)
}
