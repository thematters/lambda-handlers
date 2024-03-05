import { SimulateContractErrorType, formatUnits } from 'viem'
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'

import {
  billboardContract,
  getClearableAuctions,
  distributionContract,
  publicClient,
  walletClient,
} from '../lib/billboard/index.js'
import { Slack } from '../lib/utils/slack.js'

type RequestBody = {
  fromTokenId: string
  toTokenId: string
  merkleRoot: string
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

  // Step 1: clear auctions
  try {
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

  let tax: bigint
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

  // Step 3: create new drop with merkle root and tax
  try {
    const dropResult = await publicClient.simulateContract({
      ...distributionContract,
      functionName: 'drop',
      args: [treeId, merkleRoot, tax],
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

  // response
  const data = {
    auctionIds: auctions.map((a) => a.auctionId.toString()),
    totalTax: tax.toString(),
    merkleRoot,
  }
  slack.sendStripeAlert({
    data,
    message: `Drop ${treeId} with USDT ${formatUnits(tax, 6)}.`,
  })
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'done.',
      data,
    }),
  }
}
