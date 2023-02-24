#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import {
  refreshSearchIndexUser,
  refreshSearchIndexTag,
  refreshSearchIndexArticle,
} from "../lib/refresh-search-index.js";

async function main() {
  const args = process.argv.slice(2);

  let skipUser = false,
    skipTag = false,
    skipArticle = false;
  while (args[0]?.startsWith("--")) {
    switch (args.shift()) {
      case "--skipUser":
        skipUser = true;
        break;
      case "--skipTag":
        skipTag = true;
        break;
      case "--skipArticle":
        skipArticle = true;
        break;
    }
  }

  const checkLastBatchSize = Number.parseInt(args[0] ?? "1000", 10);
  const checkLastBatchOffset = Number.parseInt(args[1] ?? "0", 10);
  const range = args[2] ?? "1 month";

  await Promise.allSettled([
    !skipUser &&
      refreshSearchIndexUser({
        checkLastBatchSize,
        checkLastBatchOffset,
        range,
      }),
    !skipTag &&
      refreshSearchIndexTag({
        checkLastBatchSize,
        checkLastBatchOffset,
        range,
      }),
    !skipArticle &&
      refreshSearchIndexArticle({
        checkLastBatchSize,
        checkLastBatchOffset,
        range,
      }),
  ]);
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
