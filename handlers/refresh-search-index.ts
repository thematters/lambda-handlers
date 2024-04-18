import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'

import {
  refreshSearchIndexUser,
  refreshSearchIndexTag,
  refreshSearchIndexArticle,
} from '../lib/refresh-search-index.js'

interface indexArgs {
  searchKey?: string
  migrate?: boolean
  checkLastBatchSize?: number
  checkLastBatchOffset?: number
  range?: string
}

export const handler = async (
  event: APIGatewayEvent & {
    userArgs?: indexArgs
    tagArgs?: indexArgs
    articleArgs?: indexArgs
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  const { userArgs, tagArgs, articleArgs } = event

  await Promise.allSettled([
    // checkMotorBadge(),
    refreshSearchIndexUser(userArgs),
    refreshSearchIndexTag(tagArgs),
    refreshSearchIndexArticle(articleArgs),
  ])

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'done.',
    }),
  }
}
