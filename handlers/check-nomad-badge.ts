import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
import { checkNomadBadge } from '../lib/check-nomad-badge.js'

export const handler = async (
  event: APIGatewayEvent & {
    campaignTagIds?: number[]
    campaignBegins?: Date | string
    campaignEnds?: Date | string
    forceRun?: boolean
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event:`, event)
  console.log(`Context:`, context)

  const { method, path } = (event?.requestContext as any)?.http || {}
  const { accept, origin }: { accept?: string; origin?: string } =
    event?.headers || {}
  if (
    !(
      event?.forceRun ||
      (path === '/refresh' && accept?.includes('application/json'))
    )
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          'input error, call with POST /refresh with accept: application/json',
      }),
    }
  }

  const { campaignTagIds, campaignBegins, campaignEnds } = event
  const newBadges = await checkNomadBadge({
    campaignTagIds,
    campaignBegins,
    campaignEnds,
    dryRun: false,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `done${
        newBadges?.length > 0
          ? `, processed ${newBadges.length} new or upgraded nomad badges`
          : ', with nothing to do...'
      }.`,
      newBadges,
    }),
    // ...(origin && ["https://matters-tech.static.observableusercontent.com"].includes(origin) ? { headers: { "Access-Control-Allow-Origin": origin, }, } : null),
  }
}
