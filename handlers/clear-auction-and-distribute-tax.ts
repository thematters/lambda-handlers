import { SimulateContractErrorType, formatUnits } from 'viem'
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'

import {
  billboardContract,
  getClearableAuctions,
  distributionContract,
  publicClient,
  walletClient,
} from '../lib/billboard/index.js'
import { SLACK_MESSAGE_STATE, Slack } from '../lib/utils/slack.js'

type Step = 'clearAuctions' | 'withdrawTax' | 'drop'

type RequestBody = {
  fromTokenId: string // bigint
  toTokenId: string // bigint
  merkleRoot: string
  fromStep?: Step
  tax?: string // bigint
  // accessToken: string // to protect this API?
}

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  const slack = new Slack()
  const body = (event.body ? JSON.parse(event.body) : {}) as RequestBody
  const fromTokenId = BigInt(body.fromTokenId || 0)
  const toTokenId = BigInt(body.toTokenId || 0)
  const merkleRoot = body.merkleRoot as `0x${string}`
  const treeId = merkleRoot
  const fromStep: Step = body.fromStep || 'clearAuctions'

  slack.sendStripeAlert({
    data: { event, context },
    message: 'Start to clear auctions and distribute tax.',
    state: SLACK_MESSAGE_STATE.successful,
  })

  const taxAllocation = process.env.TAX_ALLOCATION
  if (!taxAllocation) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'no tax allocation' }),
    }
  }

  // Step 1: clear auctions
  let clearedAuctions: string[] = []
  if (fromStep === 'clearAuctions') {
    try {
      const isInvalidTokenIds =
        fromTokenId <= 0 || toTokenId <= 0 || fromTokenId >= toTokenId
      if (isInvalidTokenIds) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'invalid params' }),
        }
      }

      // get auctions to be cleared
      const auctions = await getClearableAuctions({ fromTokenId, toTokenId })
      if (!auctions || auctions.length <= 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'no auction to clear.' }),
        }
      }
      clearedAuctions = auctions.map(({ tokenId }) => tokenId.toString())

      const clearAuctionsResult = await publicClient.simulateContract({
        ...billboardContract,
        functionName: 'clearAuctions',
        args: [auctions.map(({ tokenId }) => tokenId)],
      })
      await walletClient.writeContract(clearAuctionsResult.request)
    } catch (err) {
      const error = err as SimulateContractErrorType
      console.error(error.name, err)

      slack.sendStripeAlert({
        data: { event, errorName: error.name },
        message: 'Failed to clear auctions.',
      })

      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.name }),
      }
    }
  }

  let tax: bigint = BigInt(body.tax || 0)
  if (fromStep === 'clearAuctions' || fromStep === 'withdrawTax') {
    try {
      // Step 2: withdraw tax
      const withdrawTaxResult = await publicClient.simulateContract({
        ...billboardContract,
        functionName: 'withdrawTax',
      })
      await walletClient.writeContract(withdrawTaxResult.request)
      tax = withdrawTaxResult.result
    } catch (err) {
      const error = err as SimulateContractErrorType
      console.error(error.name, err)

      slack.sendStripeAlert({
        data: { event, errorName: error.name },
        message: 'Failed to withdraw tax.',
      })

      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.name }),
      }
    }
  }

  // Step 3: create new drop with merkle root and tax
  const taxToDrop = (tax * BigInt(taxAllocation)) / BigInt(100)
  if (
    fromStep === 'clearAuctions' ||
    fromStep === 'withdrawTax' ||
    fromStep === 'drop'
  ) {
    try {
      const dropResult = await publicClient.simulateContract({
        ...distributionContract,
        functionName: 'drop',
        args: [treeId, merkleRoot, taxToDrop],
      })
      await walletClient.writeContract(dropResult.request)
    } catch (err) {
      const error = err as SimulateContractErrorType
      console.error(error.name, err)

      slack.sendStripeAlert({
        data: { event, errorName: error.name },
        message: 'Failed to create new drop.',
      })

      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.name }),
      }
    }
  }

  // response
  const data = {
    auctionIds: clearedAuctions,
    totalTax: tax.toString(),
    taxToDrop: taxToDrop.toString(),
    merkleRoot,
  }
  slack.sendStripeAlert({
    data,
    message: `Drop ${treeId} with USDT ${formatUnits(taxToDrop, 6)}.`,
    state: SLACK_MESSAGE_STATE.successful,
  })
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'done.',
      data,
    }),
  }
}
