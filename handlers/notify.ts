import Redis from 'ioredis'
import { SQSEvent } from 'aws-lambda'
import { getKnexClient } from '../lib/utils/db.js'
import { NotificationService } from '../lib/notification/index.js'

const knexConnectionUrl = process.env.MATTERS_PG_CONNECTION_STRING || ''
const knexROConnectionUrl = process.env.MATTERS_PG_RO_CONNECTION_STRING || ''
const redisHost = process.env.MATTERS_REDIS_HOST || ''
const redisPort = parseInt(process.env.MATTERS_REDIS_PORT || '6379', 10)

const SKIP_NOTICE_FLAG_PREFIX = 'skip-notice'
const DELETE_NOTICE_KEY_PREFIX = 'delete-notice'
const DELETE_NOTICE_CACHE_EXPIRE = 60 * 3 // 3 minutes

const knex = getKnexClient(knexConnectionUrl)
const knexRO = getKnexClient(knexROConnectionUrl)
const redis = new Redis(redisPort, redisHost)

const notificationService = new NotificationService({ knex, knexRO })

export const handler = async (event: SQSEvent) => {
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      // skip canceled
      console.log(body)
      const params = JSON.parse(body)
      if ('tag' in params) {
        const skipFlag = `${SKIP_NOTICE_FLAG_PREFIX}:${params.tag}`
        if (await redis.exists(skipFlag)) {
          console.info(`Tag ${skipFlag} exists, skipped`)
          return
        }
      }

      const notices = await notificationService.trigger(params)

      if (notices.length > 0 && 'tag' in params) {
        const deleteKey = `${DELETE_NOTICE_KEY_PREFIX}:${params.tag}`
        Promise.all(
          notices.map(async (notice) => {
            redis.sadd(deleteKey, notice.id)
            redis.expire(deleteKey, DELETE_NOTICE_CACHE_EXPIRE)
          })
        )
      }
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
