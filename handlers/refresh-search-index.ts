import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

// import { checkMotorBadge } from "../lib/check-motor-badge.js";
import {
  refreshSearchIndexUser,
  refreshSearchIndexTag,
} from "../lib/refresh-search-index.js";

export const handler = async (
  event: APIGatewayEvent & {
    searchUserKey?: string;
    searchTagKey?: string;
    migrate?: boolean;
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const { searchUserKey = "user", searchTagKey = "tag", migrate } = event;

  await Promise.allSettled([
    // checkMotorBadge(),
    refreshSearchIndexUser(searchUserKey, migrate),
    refreshSearchIndexTag(searchTagKey, migrate),
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
