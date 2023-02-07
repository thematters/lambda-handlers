import type { SQSEvent } from "aws-lambda";
import { sendmail } from "../lib/user-retention/sendmail.js";

// envs
// MATTERS_SENDGRID_API_KEY
// MATTERS_SITE_DOMAIN
// MATTERS_NEW_FEATURE_TAG_ID;
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE
// MATTERS_PG_RO_CONNECTION_STRING

export const handler = async (event: SQSEvent) => {
  console.log(event);
  const results = await Promise.allSettled(
    event.Records.map(({ body }: { body: string }) => {
      const { userId, lastSeen, type } = JSON.parse(body);
      sendmail(userId, lastSeen, type);
    })
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
