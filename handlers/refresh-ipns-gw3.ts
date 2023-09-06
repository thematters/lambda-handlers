import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import { refreshIPNSFeed } from "../lib/refresh-ipns-gw3.js";
import { dbApi, Item } from "../lib/db.js";

export const handler = async (
  event: APIGatewayEvent & {
    userName?: string | string[];
    limit?: number;
    offset?: number;
    batchCount?: number;
    concurrency?: number;
    forceReplace?: boolean;
    useMattersIPNS?: boolean;
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  const {
    limit = 50,
    batchCount = 15,
    concurrency = 5,
    forceReplace,
    useMattersIPNS,
  } = event;
  // let userName = event.userName as string;
  let names: string[] = [];
  if (Array.isArray(event?.userName)) {
    names = Array.from(event?.userName);
  } else if (typeof event?.userName === "string") {
    names = event.userName.trim().split(/\s+/).filter(Boolean);
  } else {
    const authors = await dbApi.listRecentAuthors({
      limit: batchCount,
      offset: event?.offset,
    });
    // if (authors?.[0]?.userName) userName = authors?.[0]?.userName;
    names = authors.map(({ userName }) => userName).filter(Boolean);
    console.log(
      new Date(),
      `got latest author '${names}' fromrecent authors:`,
      authors
    );
  }

  const data: any[] = [];

  const promises = new Map(
    names
      .splice(0, concurrency) // start with CONCURRENCY=3
      .map((userName: string) => [
        userName,
        processUser(userName, { limit, forceReplace, useMattersIPNS }),
      ])
  );

  while (promises.size > 0) {
    const item = await Promise.race(promises.values());
    data.push(item);
    promises.delete(item.userName);

    if (names.length > 0) {
      const userName = names.shift() as string;
      promises.set(
        userName,
        processUser(userName, { limit, forceReplace, useMattersIPNS })
      );
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
      data,
    }),
  };
};

async function processUser(
  userName: string,
  {
    limit = 50,
    forceReplace = false,
    useMattersIPNS,
  }: {
    limit?: number;
    forceReplace?: boolean;
    useMattersIPNS?: boolean;
  } = {}
) {
  // let limit = event.limit ?? 50; // default try 50 articles
  let data = await refreshIPNSFeed(userName, {
    limit,
    forceReplace,
    useMattersIPNS,
  });
  while (!(+(data?.missingInLast50 ?? data?.missing) === 0)) {
    console.log(new Date(), `for ${userName} not up-to-date, got data:`, data);
    if (limit >= 150) limit = 50;
    else if (limit >= 50) limit = 30;
    else if (limit > 10) limit = 10;
    else if (limit > 1) limit = Math.ceil(limit / 2); // try 10, 5, 3, 2, 1

    data = await refreshIPNSFeed(userName, {
      limit, // if no success, try again with latest 10 only
      forceReplace,
      useMattersIPNS,
    });
    if (limit === 1) break;
  }
  if (limit > 10 && !(+(data?.missingInLast50 ?? data?.missing) === 0)) {
    console.log(
      new Date(),
      `for ${userName} still not up-to-date, try last 1 time with limit:10 entries, from data:`,
      data
    );
    data = await refreshIPNSFeed(userName, {
      limit: 10,
      forceReplace,
      useMattersIPNS,
    });
  }

  return data ?? { userName };
}
