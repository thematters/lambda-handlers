#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import {
  refreshSearchIndexUser,
  refreshSearchIndexTag,
} from "../lib/refresh-search-index.js";

async function main() {
  const args = process.argv.slice(2);
  const checkLastBatchSize = Number.parseInt(args[0], 10) || 1000;
  const checkLastBatchOffset = Number.parseInt(args[1], 10) || 0;
  const range = args[2] || "1 month";

  await Promise.allSettled([
    refreshSearchIndexUser({ checkLastBatchSize, checkLastBatchOffset, range }),
    refreshSearchIndexTag({ checkLastBatchSize, checkLastBatchOffset, range }),
  ]);
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
