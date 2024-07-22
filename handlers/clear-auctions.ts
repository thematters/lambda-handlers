import { SimulateContractErrorType } from 'viem'
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'

import {
  billboardContract,
  publicClient,
  walletClient,
} from '../lib/billboard/index.js'

type RequestBody = {
  accessToken: string // to access this API
  tokenIds: string[] // bigint
  epochs: string[] // bigint
}

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  const { tokenIds, epochs, accessToken } = (
    event.body ? JSON.parse(event.body) : {}
  ) as RequestBody
  console.log(new Date(), `from input:`, {
    tokenIds: tokenIds,
    epochs: epochs,
  })

  if (accessToken !== process.env.ACCESS_TOKEN) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'invalid access token' }),
    }
  }

  try {
    const clearAuctionsResult = await publicClient.simulateContract({
      ...billboardContract,
      functionName: 'clearAuctions',
      args: [tokenIds.map((i) => BigInt(i)), epochs.map((i) => BigInt(i))],
    })
    await walletClient.writeContract(clearAuctionsResult.request)

    const bidders = clearAuctionsResult.result.map((r) => r[0])
    const prices = clearAuctionsResult.result.map((r) => r[1])
    const taxes = clearAuctionsResult.result.map((r) => r[2])

    const data = {
      tokenIds,
      epochs,
      bidders,
      prices,
      taxes,
    }
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

    return {
      statusCode: 500,
      body: JSON.stringify({ data, message: error.name }),
    }
  }
}
