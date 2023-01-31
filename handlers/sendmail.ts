import { SQSEvent } from "aws-lambda";
import { Mail } from "../lib/mail.js";

const sgKey = process.env.MATTERS_SENDGRID_API_KEY || "";

const mail = new Mail(sgKey);

export const handler = async (event: SQSEvent) => {
  console.log(event.Records);
  const results = await Promise.allSettled(
    event.Records.map(({ body }: { body: string }) =>
      mail.send(JSON.parse(body))
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
