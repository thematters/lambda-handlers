import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGIONAWS_REGION });

export const s3DeleteFile = async (bucket: string, key: string) =>
  s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
