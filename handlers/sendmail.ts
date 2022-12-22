import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import { Mail } from "../lib/mail.js";

const sgKey = process.env.SENDGRID_API_KEY || "";

const mail = new Mail(sgKey);

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
