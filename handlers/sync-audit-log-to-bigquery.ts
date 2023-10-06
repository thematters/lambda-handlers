import type { S3Event } from "aws-lambda";

import { S3, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { BigQuery } from "@google-cloud/bigquery";

import * as fs from "fs";
import { createGunzip } from "zlib";
import { createInterface } from "readline";

const auditLogLabel = "audit-log";
const projectId = process.env.MATTERS_BIGQUERY_PROJECT_ID;
const datasetId = process.env.MATTERS_BIGQUERY_DATASET_ID || "";
const tableId = process.env.MATTERS_BIGQUERY_TABLE_ID || "";
const clientEmail = process.env.MATTERS_BIGQUERY_CLIENT_EMAIL;
const privateKey = process.env.MATTERS_BIGQUERY_PRIVATE_KEY || "";

const s3 = new S3({});
const bigquery = new BigQuery({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
  },
});

export const handler = async (event: S3Event) => {
  console.dir(event, { depth: null });
  const fileKey = event.Records[0].s3.object.key;
  if (!fileKey.includes("stdouterr.log")) {
    console.log(`${fileKey} skipped`);
    return;
  }
  const bucket = event.Records[0].s3.bucket.name;
  const response = await s3.getObject({ Bucket: bucket, Key: fileKey });
  const hash = event.Records[0].s3.object.eTag;
  const dst = "/tmp/" + hash + ".json";
  const count = await processAndDumpLocal(response, dst);
  if (count > 0) {
    await uploadToBigQuery(dst);
    console.log(`uploaded ${count} audit log entries to bigquery`);
  } else {
    console.log(`no augit log entries found`);
  }
};

// helpers

const readFile = async (s3Response: GetObjectCommandOutput) => {
  const stream = s3Response.Body as NodeJS.ReadableStream;
  return createInterface({
    input: stream.pipe(createGunzip()),
    crlfDelay: Infinity,
  });
};

const processAndDumpLocal = async (
  s3Response: GetObjectCommandOutput,
  dst: string
): Promise<number> => {
  const lineReader = await readFile(s3Response);
  const writeStream = fs.createWriteStream(dst);
  let count = 0;

  for await (const line of lineReader) {
    const splits = line.split(" ");
    if (splits.length < 5) {
      continue;
    }
    const timestamp = splits[0] + " " + splits[1];
    const requestId = splits[2];
    const label = splits[3];
    // const level = splits[4]
    const message = splits.slice(5).join(" ");
    if (label === auditLogLabel) {
      count += 1;
      const data = JSON.parse(message);
      writeStream.write(
        JSON.stringify({
          actor_id: data.actorId,
          action: data.action ? data.action.slice(0, 50) : undefined,
          entity: data.entity ? data.entity.slice(0, 50) : undefined,
          entity_id: data.entityId,
          old_value: data.oldValue ? data.oldValue.slice(0, 255) : undefined,
          new_value: data.newValue ? data.newValue.slice(0, 255) : undefined,
          status: data.status.slice(0, 10),
          request_id: requestId ? requestId.slice(0, 36) : undefined,
          ip: data.ip ? data.ip.slice(0, 45) : undefined,
          user_agent: data.userAgent ? data.userAgent.slice(0, 255) : undefined,
          created_at: timestamp,
        }) + "\n"
      );
    }
  }
  return count;
};

const uploadToBigQuery = async (src: string) => {
  const [job] = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .load(src, { format: "json" });

  console.log(`Job ${job.id} completed.`);

  const errors = job?.status?.errors;
  if (errors && errors.length > 0) {
    throw errors;
  }
};
