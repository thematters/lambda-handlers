import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'

import { formatUnits } from 'viem'
import * as d3 from 'd3-array'
import {
  calculateQFScore,
  sendQfNotifications, //  sendQfNotificationNEmails,
  MattersBillboardS3Bucket,
  isProd,
  s3FilePathPrefix,
} from '../lib/qf-calculate.js'
import { s3GetFile } from '../lib/utils/aws.js'
import { SLACK_MESSAGE_STATE, Slack } from '../lib/utils/slack.js'

const ACCESS_TOKEN = `${process.env.ACCESS_TOKEN}`

interface InputBodyParameters {
  fromTime?: string
  toTime?: string
  fromBlock: string
  toBlock: string
  amountTotal?: string
  finalize?: boolean
}

export const handler = async (
  event: APIGatewayEvent & {
    forceRun?: boolean
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)
  // const forceRun = !!("forceRun" in ((event?.queryStringParameters as any) || {}));

  const slack = new Slack()
  const { method, path } = ((event?.requestContext as any)?.http as any) || {}
  const queryStringParameters = (event?.queryStringParameters as any) || {}
  const {
    accept,
    origin,
    authorization,
  }: { accept?: string; origin?: string; authorization?: string } =
    event?.headers || {}

  const accessToken = authorization?.split(/\s+/)?.[1]
  if (accessToken !== ACCESS_TOKEN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'invalid access token' }),
    }
  }

  if (
    !(
      event?.forceRun ||
      (path === '/qf-calculator' && accept?.startsWith('application/json')) ||
      (path === '/send-notifications' && accept) ||
      (path === '/get-rounds' && accept)
    )
  ) {
    return {
      statusCode: 400,
      // contentType: 'text/plain',
      headers: { 'content-type': 'text/plain' },
      // JSON.stringify({ error:
      body: 'input error, call with POST /qf-calculator with accept: application/json',
      // }),
    }
  }

  if (path === '/get-rounds') {
    const { key } = queryStringParameters
    const res = await s3GetFile({
      bucket: MattersBillboardS3Bucket, // 'matters-billboard',
      key, // : key?.endsWith('.json') ? key : `pre-rounds/rounds.json`,
    }) // .then((res) => console.log(new Date(), `s3 get pre-rounds:`, res));
    console.log(new Date(), `s3 get rounds:`, res.ContentLength)

    if (!res.Body) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'text/plain' },
        body: 'file not found',
      }
    }
    const body = await res.Body.transformToString()
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: body,
    }
  } else if (method === 'POST' && path === '/send-notifications' && accept) {
    // get distrib.json and send notifications;
    let { key = 'latest', roundEnd, amountTotal = '' } = queryStringParameters
    // let key = (queryStringParameters?.key || 'latest') as string
    // get latest round path to distrib.json
    try {
      if (key === 'latest') {
        const res = await s3GetFile({
          bucket: MattersBillboardS3Bucket, // 'matters-billboard',
          key: `${s3FilePathPrefix}/rounds.json`, // : key?.endsWith('.json') ? key : `pre-rounds/rounds.json`,
        }) // .then((res) => console.log(new Date(), `s3 get pre-rounds:`, res));
        if (res.Body && res.ContentLength! > 0) {
          const existingRounds = JSON.parse(
            await res.Body.transformToString()
          ) as any[]
          const latestRound = existingRounds
            .filter(({ draft }) => !draft) // skip if not finalized yet;
            .sort((a, b) => d3.descending(a.toTime, b.toTime))?.[0]
          if (latestRound?.dirpath) {
            key = `${s3FilePathPrefix}/${latestRound.dirpath}/distrib.json`
            roundEnd = latestRound?.toTime
          }
          if (!amountTotal && latestRound?.amountTotal) {
            amountTotal = latestRound?.amountTotal
          }
        }
      }
    } catch (err) {
      console.error(new Date(), `ERROR in retrieving latest round:`, err) // continue try the given key path
    }

    const res1 = await s3GetFile({
      bucket: MattersBillboardS3Bucket, // 'matters-billboard',
      key, // : key?.endsWith('.json') ? key :
    })
    console.log(
      new Date(),
      `s3 get distribs for notifying:`,
      res1.ContentLength,
      { key }
    )

    if (!res1.Body) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'text/plain' },
        body: 'file not found',
      }
    }

    try {
      const distribs = JSON.parse(await res1.Body.transformToString())
      const sent = await sendQfNotifications(
        distribs,
        roundEnd,
        queryStringParameters?.doNotify === 'true'
      )
      const message = `sent qf notifications of total ${+formatUnits(
        amountTotal,
        6
      )} USDT to ${sent?.length ?? 0} authors`
      if (Array.isArray(sent) && sent?.length > 0) {
        await slack.sendStripeAlert({
          data: {
            amountTotal,
            sent: sent.length,
            distrib: sent.map(
              ({ userName, displayName, amount }: any) =>
                `${displayName} @${userName} ${amount} USDT`
            ),
          },
          message,
          state: SLACK_MESSAGE_STATE.successful,
        })
      }
      return {
        statusCode: 200,
        body: message,
      }
    } catch (err) {
      console.error(new Date(), `got ERROR in send qf notif:`, err)
      return {
        statusCode: 400,
        body: '',
      }
    }
  } else if (
    method === 'POST' &&
    path === '/qf-calculator' &&
    accept?.startsWith('application/json')
  ) {
    const { fromTime, toTime, fromBlock, toBlock, amountTotal, finalize } = (
      event?.forceRun ? event : queryStringParameters
    ) as InputBodyParameters

    const { root, gist_url } =
      (await calculateQFScore({
        // fromTime, toTime,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
        amountTotal: BigInt(+(amountTotal || 10_000)),
        finalize: !!finalize,
      })) || {}
    if (!root) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'bad parameters, no tree root, check logs for details.',
        }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        message: 'done.',
        root, // tree
        gist_url,
      }),
    }
  }

  return {
    statusCode: 400,
    // contentType: 'text/plain',
    headers: { 'content-type': 'text/plain; charset=utf-8' },
    // JSON.stringify({ error:
    body: 'input error, call with POST /qf-calculator with accept: application/json',
    // }),
  }
}
