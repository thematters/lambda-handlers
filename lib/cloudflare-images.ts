import _ from "lodash";

import { RateLimitQueue } from "../lib/rate-queue.js";

// https://developers.cloudflare.com/fundamentals/api/reference/limits/
const q = new RateLimitQueue(1200, 300e3);

const MATTERS_CLOUDFLARE_ACCOUNT_ID =
  process.env.MATTERS_CLOUDFLARE_ACCOUNT_ID || "";
const MATTERS_CLOUDFLARE_API_TOKEN =
  process.env.MATTERS_CLOUDFLARE_API_TOKEN || "";

export class CloudflareImagesAPI {
  getImage({ identifier }: { identifier: string }) {
    // get image
    return fetch(
      `https://api.cloudflare.com/client/v4/accounts/${MATTERS_CLOUDFLARE_ACCOUNT_ID}/images/v1/${identifier}`,
      {
        headers: {
          // "Content-Type": "application/json",
          Authorization: `Bearer ${MATTERS_CLOUDFLARE_API_TOKEN}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    ).then(async (res) => {
      if (
        res.ok &&
        res.headers.get("content-type")?.startsWith("application/json")
      )
        return res.json();
      else {
        console.log(new Date(), "res:", res.ok, res.status, res.headers);
        console.log("res content:", await res.text());
        // return res.text();
      }
    });
  }

  postImage({
    url,
    identifier,
    createdAt,
    file,
  }: {
    url?: string;
    identifier: string;
    createdAt?: Date | string;
    file?: File | Blob | Buffer;
  }) {
    if (!url && !file) {
      console.error(new Date(), `need url or file`);
      return;
    }
    const formData = new FormData();
    if (url) formData.append("url", url);
    if (file) formData.append("file", new Blob([file]), identifier);

    formData.append("id", identifier);
    formData.append(
      "metadata",
      JSON.stringify(
        _.omitBy(
          {
            uploader: "sync-s3-images-to-cloudflare.js/0.1",
            origin: "assets.matters.news",
            orig_created_at: createdAt,
          },
          _.isNil
        )
      )
    );
    console.log(new Date(), `postImage with formData:`, formData);

    return fetch(
      `https://api.cloudflare.com/client/v4/accounts/${MATTERS_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          // "Content-Type": "application/json",
          // "Content-Type": "multipart/form-data; boundary=---011000010111000001101001",
          Authorization: `Bearer ${MATTERS_CLOUDFLARE_API_TOKEN}`,
        },
        body: formData,
        signal: AbortSignal.timeout(15e3),
      }
    ).then(async (res) => {
      if (
        res.ok ||
        res.headers.get("content-type")?.startsWith("application/json")
      )
        return res.json();
      else {
        console.log(new Date(), "res:", res.ok, res.status, res.headers);
        console.log("res content:", await res.text());
        // return res.text();
      }
    }); // ).then((res) => res.json());
  }
}

export const cfApi = new CloudflareImagesAPI();

// export const cfApiThrottled = new Proxy( cfApi, { get(target, prop, receiver) { } });

export const cfApiThrottled = {
  getImage(args: any) {
    return q.append(() => cfApi.getImage(args));
  },
  postImage(args: any) {
    return q.append(() => cfApi.postImage(args));
  },
};
