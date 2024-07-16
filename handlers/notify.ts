import { SQSEvent } from 'aws-lambda'
import { getKnexClient } from '../lib/utils/db.js'
import { NotificationService } from '../lib/notification/index.js'

const knex = getKnexClient(process.env.MATTERS_PG_CONNECTION_STRING || '')
const knexRO = getKnexClient(process.env.MATTERS_PG_RO_CONNECTION_STRING || '')

const notificationService = new NotificationService({ knex, knexRO })

export const handler = async (event: SQSEvent) => {
  console.log(event.Records)
  const results = await Promise.allSettled(
    event.Records.map(({ body }: { body: string }) =>
      notificationService.trigger(JSON.parse(body))
    )
  )
  // print failed reseaon
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
