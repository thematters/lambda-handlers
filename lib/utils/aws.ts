import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_REGIONAWS_REGION })

export const s3DeleteFile = async (bucket: string, key: string) =>
  s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )

export const s3PutFile = async ({
  Bucket,
  Key,
  Body,
  ACL,
  ContentType,
}: {
  Bucket: string
  Key: string
  Body: string
  ACL?: 'private' | 'public-read'
  ContentType?: 'application/json'
}) =>
  s3.send(
    new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ACL,
      ContentType,
    })
  )

export const s3GetFile = async ({
  bucket,
  key,
}: {
  bucket: string
  key: string
}) =>
  s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )
