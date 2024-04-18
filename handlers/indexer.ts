import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda'
// import { create } from "ipfs-http-client";
import { ipfsPool } from '../lib/ipfs-servers.js'

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`)
  console.log(`Context: ${JSON.stringify(context, null, 2)}`)

  const ipfs = ipfsPool.get() // create({ url: "http://ipfs.dev.vpc:5001/api/v0" });
  console.log(new Date(), 'call ipfs.id:', await ipfs.id())

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'hello world',
    }),
  }
}
