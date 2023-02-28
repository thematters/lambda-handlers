import { APIGatewayProxyResult } from "aws-lambda";
import { LikeCoin } from "../lib/likecoin.js";

// env
// MATTERS_CACHE_HOST
// MATTERS_CACHE_PORT
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

const likecoin = new LikeCoin();

export const handler = async (
  event: string[]
): Promise<APIGatewayProxyResult> => {
  console.log(event);
  if (!Array.isArray(event)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Unexpected input.",
      }),
    };
  }

  const civicLikerIds = event;
  const expire = 60 * 60 * 24 * 1.1; // 1.1 days

  try {
    await likecoin.updateCivicLikerCaches({ civicLikerIds, expire });
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "succeeded.",
      }),
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "failed.",
      }),
    };
  }
};
