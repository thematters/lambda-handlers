import { APIGatewayProxyResult } from "aws-lambda";
import { LikeCoin } from "../lib/likecoin.js";

// env
// MATTERS_CACHE_HOST
// MATTERS_CACHE_PORT
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

type Event = {
  id: string;
  expires: number; // in days
}[];

const likecoin = new LikeCoin();
const DAY = 24 * 60 * 60;

export const handler = async (event: Event): Promise<APIGatewayProxyResult> => {
  console.log(event);
  if (!validate(event)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Unexpected input.",
      }),
    };
  }

  try {
    await likecoin.updateCivicLikerCaches(
      event.map(({ id, expires }) => ({ likerId: id, expire: expires * DAY }))
    );
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

const validate = (event: any): boolean => {
  if (!Array.isArray(event)) {
    return false;
  }
  for (const i of event) {
    if (typeof i.id !== "string") {
      return false;
    }
    if (typeof i.expires !== "number") {
      return false;
    }
  }
  return true;
};
