import Redis from 'ioredis'
import { SQSEvent } from 'aws-lambda'
import { getKnexClient } from '../lib/utils/db.js'
import { NotificationService } from '../lib/notification/index.js'

const knexConnectionUrl = process.env.MATTERS_PG_CONNECTION_STRING || ''
const knexROConnectionUrl = process.env.MATTERS_PG_RO_CONNECTION_STRING || ''
const redisHost = process.env.MATTERS_REDIS_HOST || ''
const redisPort = parseInt(process.env.MATTERS_REDIS_PORT || '6379', 10)

const knex = getKnexClient(knexConnectionUrl)
const knexRO = getKnexClient(knexROConnectionUrl)
const redis = new Redis(redisPort, redisHost)

const notificationService = new NotificationService({ knex, knexRO })

export const handler = async (event: SQSEvent) => {
  console.log(event.Records)
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      // skip canceled notices
      const params = JSON.parse(body)
      if ('tag' in params) {
        const res = await redis.exists(params.tag)
        if (res === 1) {
          console.info(`Tag ${params.tag} exists, skipped processing notice`)
          return
        }
      }
      await notificationService.trigger(params)
    })
  )
  // print failed reason
  results.map((res) => {
    if (res.status === 'rejected') {
      console.error(res.reason)
    }
  })

  // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
  return {
    batchItemFailures: results
      .map((res, index) => {
        if (res.status === 'rejected') {
          return { itemIdentifier: event.Records[index].messageId }
        }
      })
      .filter(Boolean),
  }
}
