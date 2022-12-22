import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import {
  refreshSearchIndexUser,
  refreshSearchIndexTag,
} from "../lib/refresh-search-index.js";

interface indexInput {
  searchKey?: string;
  migrate?: boolean;
  checkLastBatchSize?: number;
  checkLastBatchOffset?: number;
  range?: string;
}

export const handler = async (
  event: APIGatewayEvent & {
    user?: indexInput;
    tag?: indexInput;
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const { user: userInput, tag: tagInput } = event;

  await Promise.allSettled([
    // checkMotorBadge(),
    refreshSearchIndexUser(userInput),
    refreshSearchIndexTag(tagInput),
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
