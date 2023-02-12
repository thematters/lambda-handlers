import { SQSEvent } from "aws-lambda";
import { archiveUser } from "../lib/archive-user/index.js";

// envs
// MATTERS_DRAFT_ENTITY_TYPE_ID
// MATTERS_AWS_S3_BUCKET
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

export const handler = async (event: SQSEvent) => {
  console.log(event.Records);
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      const {userId} = JSON.parse(body)
      await archiveUser(userId)
    }
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
