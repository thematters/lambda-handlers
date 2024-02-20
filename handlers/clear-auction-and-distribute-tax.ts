import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
import {
  billboardContract,
  getClearableAuctions,
  publicClient,
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
  const merkleRoot = event.merkleRoot

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

  // Step 1: Get total tax of next auction
  let clearAuctionRequest: any
  let totalTax: bigint
  try {
    const result = await publicClient.simulateContract({
      ...billboardContract,
      functionName: 'clearAuctions',
      args: [auctions.map(({ tokenId }) => tokenId)],
    })
    clearAuctionRequest = result.request
    totalTax = result.result[1].reduce((acc, cur) => acc + cur, BigInt(0))
  } catch (err) {
    const error = err as SimulateContractErrorType
    console.error(error.name, err)

    // if (err instanceof BaseError) {
    //   const revertError = err.walk(
    //     (err) => err instanceof ContractFunctionRevertedError,
    //   );
    //   if (revertError instanceof ContractFunctionRevertedError) {
    //     const errorName = revertError.data?.errorName ?? "";
    //     console.error(errorName, err);
    //   }
    // }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.name,
      }),
    }
  }

  // Step 2: Multicall to
  //   1. clear auction
  //   2. withdraw tax
  //   2. create new drop with merkle root and tax
  await publicClient.multicall({
    contracts: [
      clearAuctionRequest,
      // 2
      // 3
    ],
  })
  // await walletClient.writeContract(request);

  return {
    statusCode: 500,
    body: JSON.stringify({
      message: 'done.',
      data: {
        auctionIds: auctions.map((a) => a.auctionId.toString()),
        totalTax: totalTax.toString(),
        merkleRoot,
      },
    }),
  }
}
