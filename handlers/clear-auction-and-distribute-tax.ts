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

const notifySlack = process.env.DO_NOTIFY_SLACK === 'true'

type Step = 'clearAuctions' | 'withdrawTax' | 'drop'

type RequestBody = {
  accessToken: string // to access this API
  fromTokenId: string // bigint
  toTokenId: string // bigint
  merkleRoot: string
  fromStep?: Step
  tax?: string // bigint
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
  console.log(new Date(), `from input:`, {
    fromTokenId,
    toTokenId,
    merkleRoot,
    treeId,
    fromStep,
  })

  if (body.accessToken !== process.env.ACCESS_TOKEN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'invalid access token' }),
    }
  }

  const taxAllocation = process.env.TAX_ALLOCATION
  if (!taxAllocation) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'no tax allocation' }),
    }
  }

  try {
    // Step 1: clear auctions
    let clearedAuctions: string[] = []
    if (fromStep === 'clearAuctions') {
      const isInvalidTokenIds =
        fromTokenId <= 0 || toTokenId <= 0 || toTokenId < fromTokenId
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
      await delay((2 + Math.random() * 10) * 1e3) // wait the nonce to be set correctly for next call
    }

    // Step 2: withdraw tax
    let tax: bigint = BigInt(body.tax || 0)
    if (fromStep === 'clearAuctions' || fromStep === 'withdrawTax') {
      const withdrawTaxResult = await publicClient.simulateContract({
        ...billboardContract,
        functionName: 'withdrawTax',
      })
      await walletClient.writeContract(withdrawTaxResult.request)
      tax = withdrawTaxResult.result
      await delay((2 + Math.random() * 10) * 1e3) // wait the nonce to be set correctly for next call
    }

    // Step 3: create new drop with merkle root and tax
    const taxToDrop = (tax * BigInt(taxAllocation)) / BigInt(100)
    if (
      fromStep === 'clearAuctions' ||
      fromStep === 'withdrawTax' ||
      fromStep === 'drop'
    ) {
      const dropResult = await publicClient.simulateContract({
        ...distributionContract,
        functionName: 'drop',
        args: [treeId, merkleRoot, taxToDrop],
      })
      await walletClient.writeContract(dropResult.request)
    }

    // response
    const data = {
      auctionIds: clearedAuctions,
      totalTax: tax.toString(),
      taxToDrop: taxToDrop.toString(),
      merkleRoot,
    }
    await slack.sendStripeAlert({
      data,
      message: `Drop ${treeId} with USDT ${formatUnits(taxToDrop, 6)}.`,
      state: SLACK_MESSAGE_STATE.successful,
    })
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'done.', data }),
    }
  } catch (err) {
    const error = err as SimulateContractErrorType
    console.error(error.name, err)

    const data = {
      name: error.name,
      message: error.message,
      cause: error.cause,
    }
    notifySlack && (await slack.sendStripeAlert({ data, message: error.name })) // too long error stack is not showing well on Slack, better to read in CloudWatch logs...

    return {
      statusCode: 500,
      body: JSON.stringify({ data, message: error.name }),
    }
  }
}

function delay(ms: number) {
  return new Promise((fulfilled) => setTimeout(fulfilled, ms))
}
