import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import { getUserInfo } from "../lib/get-user-info.js";

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);
  const headers = event?.headers;
  const accept = headers.accept;

  const { method, path } = (event?.requestContext as any)?.http || {};
  const m = path?.match(/\/@?(\w+)/);
  if (!accept?.includes("application/json") || !m) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          "input error, call with a matters.News userName, like `/@az`, with accept: application/json",
      }),
    };
  }

  const [, userName] = m;
  console.log(new Date(), `called get-user-info with:`, {
    method,
    path,
    m,
    userName,
  });

  // const today = new Date(); today.getUTCFullyear();
  const year =
    Number.parseInt(event?.queryStringParameters?.year as string, 10) || 2022;

  const [first] = await getUserInfo(userName, { year });
  console.log(new Date(), `got user info:`, first);

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: first,
    }),
  };
};
