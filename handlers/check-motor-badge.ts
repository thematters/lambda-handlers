import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { checkMotorBadge } from "../lib/check-motor-badge.js";

export const handler = async (
  event: any, // APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const threashold = Math.max(5, Number.parseInt(event?.threashold, 10) || 100);
  await checkMotorBadge(threashold);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
