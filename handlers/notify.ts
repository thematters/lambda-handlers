import Redis from 'ioredis'
import { SQSEvent } from 'aws-lambda'
import { getKnexClient } from '../lib/utils/db.js'
import { genMD5 } from '../lib/utils/hash.js'
import { NotificationService } from '../lib/notification/index.js'

const knexConnectionUrl = process.env.MATTERS_PG_CONNECTION_STRING || ''
const knexROConnectionUrl = process.env.MATTERS_PG_RO_CONNECTION_STRING || ''
const redisHost = process.env.MATTERS_REDIS_HOST || ''
const redisPort = parseInt(process.env.MATTERS_REDIS_PORT || '6379', 10)

const knex = getKnexClient(knexConnectionUrl)
const knexRO = getKnexClient(knexROConnectionUrl)
const redis = new Redis(redisPort, redisHost)

const notificationService = new NotificationService({ knex, knexRO })

const DEDUPLICATION_CACHE_EXPIRE = 60 * 10 // 10 minutes

export const handler = async (event: SQSEvent) => {
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      // skip canceled
      console.log(body)
      const params = JSON.parse(body)
      if ('tag' in params) {
        if (await redis.exists(params.tag)) {
          console.info(`Tag ${params.tag} exists, skipped`)
          return
        }
      }
      // deduplication: skip if notice exists
      const noticeHash = genMD5(body)
      if (await redis.exists(noticeHash)) {
        console.info(`Notice duplicated, skipped`)
        return
      }

      await notificationService.trigger(params)

      // deduplication: set notice hash
      await redis.set(noticeHash, 1, 'EX', DEDUPLICATION_CACHE_EXPIRE)
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
