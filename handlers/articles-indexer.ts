import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import {
  dbApi,
  // sql
} from "../lib/db.js";
import { articlesIndexer, Article } from "../lib/meili-indexer.js";

export const handler = async (
  event: APIGatewayEvent & {
    take?: number;
    skip?: number;
    migrate?: boolean;
  },
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);

  // const { searchUserKey = "user", searchTagKey = "tag", migrate } = event;
  const { take = 5, skip = 0 } = event;

  let articleId: string | undefined;
  const http = (event?.requestContext as any)?.http;
  if (http?.method === "POST") {
    [, articleId] = http.path.match(/\/p\/(\d+)/);
    console.log(new Date(), "request update on:", { articleId });
  }

  await dbApi.checkVersion();
  // if (Math.random() >= 1e-18) return { statusCode: 200, body: JSON.stringify({ message: "checked.", }), };

  const started = Date.now();
  let total = 0;
  for await (const articles of dbApi
    .listArticles({ articleId, take, skip })
    .cursor(5)) {
    const res = await articlesIndexer.addToSearch(articles);
    console.log(
      new Date(),
      `added ${articles.length} articles to search:`,
      res
    );
    total += articles.length;
  }
  const ended = new Date();
  console.log(ended, `processed ${total} articles in ${+ended - started}ms.`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "done.",
    }),
  };
};
