import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { LikeCoin } from "../lib/likecoin.js";

const likecoin = new LikeCoin();

export const handler = async (
  event: any, // APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(event.Records);
  await Promise.all(
    event.Records.map(({ body }: { body: string }) =>
      likecoin.sendPV(JSON.parse(body))
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
