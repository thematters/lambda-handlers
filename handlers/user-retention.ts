import type { SendmailFn } from '../lib/user-retention/types'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { processUserRetention } from '../lib/user-retention/index.js'

// envs
// MATTERS_USER_RETENTION_INTERVAL_IN_DAYS
// MATTERS_USER_RETENTION_SENDMAIL_QUEUE_URL
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE
// MATTERS_PG_RO_CONNECTION_STRING

const intervalInDays =
  parseFloat(process.env.MATTERS_USER_RETENTION_INTERVAL_IN_DAYS as string) || 6
const queueUrl = process.env.MATTERS_USER_RETENTION_SENDMAIL_QUEUE_URL || ''

export const handler = async (event: any) => {
  const client = new SQSClient({ region: process.env.AWS_REGIONAWS_REGION })
  const sendmail: SendmailFn = async (userId, lastSeen, type) => {
    try {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ userId, lastSeen, type }),
        })
      )
    } catch (error) {
      console.error(error)
    }
  }

  await processUserRetention({ intervalInDays, sendmail })
}
