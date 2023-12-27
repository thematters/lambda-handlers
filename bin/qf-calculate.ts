#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import {
  calculateQFScore,
  checkDropEventsAndNotifs,
} from "../lib/qf-calculate.js";

async function main() {
  const args = process.argv.slice(2);
  let mode: "checkDropEventsAndNotifs" | "calculateQFScore" =
    "calculateQFScore";

  switch (args?.[0]) {
    case "--checkDropEventsAndNotifs":
    case "--calculateQFScore":
      mode = args?.[0].substring(2) as any;
      args.shift();
      break;
  }
  if (mode === "checkDropEventsAndNotifs") {
    return checkDropEventsAndNotifs();
  }

  const amount = BigInt(+(args?.[0] || 500) * 1e6);

  // let fromTime: string | undefined, toTime: string | undefined;
  let [fromTime, toTime] =
    args.length >= 0
      ? [args?.[1] || "2023-10-01", args?.[2] || "2024-12-31T23:59:59.999Z"]
      : [undefined, undefined];
  // const [fromTime,toTime] = [Date.parse(from), Date.parse(to)];
  const [fromBlock, toBlock] =
    Number.isNaN(Date.parse(fromTime!)) && Number.isNaN(Date.parse(toTime!)) // not date string
      ? [BigInt(fromTime!), BigInt(toTime!)]
      : [undefined, undefined];
  if (fromBlock != null && toBlock != null) {
    [fromTime, toTime] = [undefined, undefined];
  }

  const res = await calculateQFScore({
    fromTime, //: typeof fromBlock === "bigint" ? undefined : fromTime, // : "2023-12-31",
    toTime, // : typeof toBlock === "bigint" ? undefined : toTime, // : "2024-12-31T23:59:59.999Z",
    fromBlock,
    toBlock,
    amount,
    write_gist: true,
  });
  console.log(new Date(), "res:", res);
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
