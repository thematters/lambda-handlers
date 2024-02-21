import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
import {
  billboardContract,
  getClearableAuctions,
  distributionContract,
  publicClient,
  walletClient,
} from '../lib/billboard'
import { SimulateContractErrorType } from 'viem'

export const handler = async (
  event: APIGatewayEvent & {
    fromTokenId: string
    toTokenId: string
    fromBlock: string // bigint
    toBlock: string // bigint
    amount: string // bigint
    merkleRoot: string
    // accessToken: string // to protect this API?
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  const fromTokenId = BigInt(event.fromTokenId) || BigInt(0)
  const toTokenId = BigInt(event.toTokenId) || BigInt(0)
  const fromBlock = BigInt(event.fromBlock) || BigInt(0)
  const toBlock = BigInt(event.toBlock) || BigInt(0)
  const amount = BigInt(event.amount) || BigInt(0)
  const merkleRoot = event.merkleRoot as `0x${string}`
  const treeId = `${fromBlock}-${toBlock}`

  const isInvalidTokenIds =
    fromTokenId <= 0 || toTokenId <= 0 || fromTokenId >= toTokenId
  const isInvalidBlockNumbers =
    fromBlock <= 0 || toBlock <= 0 || fromBlock >= toBlock
  const isInvalidAmount = amount <= 0
  if (isInvalidTokenIds || isInvalidBlockNumbers || isInvalidAmount) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'invalid params',
      }),
    }
  }

  // get auctions to be cleared
  const auctions = await getClearableAuctions({ fromTokenId, toTokenId })

  if (!auctions || auctions.length <= 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'no auction to clear.',
      }),
    }
  }

  try {
    // Step 1: clear auctions
    const clearAuctionsResult = await publicClient.simulateContract({
      ...billboardContract,
      functionName: 'clearAuctions',
      args: [auctions.map(({ tokenId }) => tokenId)],
    })
    await walletClient.writeContract(clearAuctionsResult.request)

    // Step 2: withdraw tax
    const withdrawTaxResult = await publicClient.simulateContract({
      ...billboardContract,
      functionName: 'withdrawTax',
    })
    await walletClient.writeContract(withdrawTaxResult.request)
    const tax = withdrawTaxResult.result

    // Step 3: create new drop with merkle root and tax
    const dropResult = await publicClient.simulateContract({
      ...distributionContract,
      functionName: 'drop',
      args: [treeId, merkleRoot, tax],
    })
    await walletClient.writeContract(dropResult.request)

    // response
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'done.',
        data: {
          auctionIds: auctions.map((a) => a.auctionId.toString()),
          totalTax: tax.toString(),
          merkleRoot,
        },
      }),
    }
  } catch (err) {
    const error = err as SimulateContractErrorType
    console.error(error.name, err)

    // TODO: error handling

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.name,
      }),
    }
  }
}
