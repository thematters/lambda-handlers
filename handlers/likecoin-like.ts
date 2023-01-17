import { SQSEvent } from "aws-lambda";
import { LikeCoin } from "../lib/likecoin.js";

// envs
// MATTERS_LIKECOIN_API_URL
// MATTERS_LIKECOIN_CLIENT_ID
// MATTERS_LIKECOIN_CLIENT_SECRET

const likecoin = new LikeCoin();

export const handler = async (event: SQSEvent) => {
  console.log(event);
  const results = await Promise.allSettled(
    event.Records.map(({ body }: { body: string }) =>
      likecoin.like(JSON.parse(body))
    )
  );

  // print failed reseaon
  results.map((res) => {
    if (res.status === "rejected") {
      console.error(res.reason);
    }
  });

  // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
  return {
    batchItemFailures: results
      .map((res, index) => {
        if (res.status === "rejected") {
          return { itemIdentifier: event.Records[index].messageId };
        }
      })
      .filter(Boolean),
  };
};
