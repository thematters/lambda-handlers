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

  // const ends = sql` date_trunc('month', NOW() - interval '1 week') ::date `;

  const started = Date.now();
  let total = 0;
  for await (const articles of dbApi.listArticles({ take, skip })) {
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
