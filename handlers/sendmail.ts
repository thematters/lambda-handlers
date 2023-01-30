import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { Mail } from "../lib/mail.js";

// envs
// MATTERS_SENDGRID_API_KEY

const mail = new Mail();

export const handler = async (
  event: any, // APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(event.Records);
  await Promise.all(
    event.Records.map(({ body }: { body: string }) =>
      mail.send(JSON.parse(body))
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
