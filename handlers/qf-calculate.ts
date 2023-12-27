import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import {
  calculateQFScore,
  sendQfNotifications,
  sendQfNotificationEmails,
} from "../lib/qf-calculate.js";
import { s3GetFile } from "../lib/utils/aws.js";

interface InputBodyParameters {
  fromTime?: string;
  toTime?: string;
  fromBlock?: string;
  toBlock?: string;
  amount?: string;
  appendToRounds?: boolean;
}

export const handler = async (
  event: APIGatewayEvent & {
    forceRun?: boolean;
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);
  // const forceRun = !!("forceRun" in ((event?.queryStringParameters as any) || {}));

  const { method, path } = ((event?.requestContext as any)?.http as any) || {};
  const queryStringParameters = (event?.queryStringParameters as any) || {};
  const { accept, origin }: { accept?: string; origin?: string } =
    event?.headers || {};
  if (
    !(
      event?.forceRun ||
      (path === "/qf-calculator" && accept?.startsWith("application/json")) ||
      (path === "/send-notifications" && accept) ||
      (path === "/get-rounds" && accept)
    )
  ) {
    return {
      statusCode: 400,
      // contentType: 'text/plain',
      headers: { "content-type": "text/plain" },
      // JSON.stringify({ error:
      body: "input error, call with POST /qf-calculator with accept: application/json",
      // }),
    };
  }

  if (path === "/get-rounds") {
    const { key } = queryStringParameters;
    const res = await s3GetFile({
      bucket: "matters-billboard",
      key: key?.endsWith(".json") ? key : `pre-rounds/rounds.json`,
    }); // .then((res) => console.log(new Date(), `s3 get pre-rounds:`, res));
    console.log(new Date(), `s3 get pre-rounds:`, res.ContentLength, res);
    if (!res.Body) {
      return {
        statusCode: 404,
        headers: { "content-type": "text/plain" },
        body: "file not found",
      };
    }
    const body = await res.Body.transformToString();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: body,
    };
  } else if (method === "POST" && path === "/send-notifications" && accept) {
    // get distrib.json and send notifications;
    const { key } = queryStringParameters;
    const res = await s3GetFile({
      bucket: "matters-billboard",
      key: key?.endsWith(".json")
        ? key
        : `pre-rounds/polygon-48178750-53561096/distrib.json`,
    }); // .then((res) => console.log(new Date(), `s3 get pre-rounds:`, res));
    console.log(new Date(), `s3 get pre-rounds:`, res.ContentLength, res);
    if (!res.Body) {
      return {
        statusCode: 404,
        headers: { "content-type": "text/plain" },
        body: "file not found",
      };
    }
    try {
      const distribs = JSON.parse(await res.Body.transformToString());
      const sent = await sendQfNotificationEmails(distribs);
      return {
        statusCode: 200,
        body: `sent qf notifications to ${sent?.length ?? 0} authors`,
      };
    } catch (err) {
      return {
        statusCode: 400,
        body: "",
      };
    }
  } else if (
    method === "POST" &&
    path === "/qf-calculator" &&
    accept?.startsWith("application/json")
  ) {
    const { fromTime, toTime, fromBlock, toBlock, amount, appendToRounds } = (
      event?.forceRun ? event : queryStringParameters
    ) as InputBodyParameters;

    const { root, gist_url } = await calculateQFScore({
      fromTime,
      toTime,
      fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
      toBlock: toBlock ? BigInt(toBlock) : undefined,
      amount: BigInt(+(amount || 500) * 1e6),
      appendToRounds: !!appendToRounds,
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        message: "done.",
        root, // tree
        gist_url,
      }),
    };
  }

  return {
    statusCode: 400,
    // contentType: 'text/plain',
    headers: { "content-type": "text/plain; charset=utf-8" },
    // JSON.stringify({ error:
    body: "input error, call with POST /qf-calculator with accept: application/json",
    // }),
  };
};
