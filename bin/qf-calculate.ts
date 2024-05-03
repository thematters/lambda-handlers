#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import {
  calculateQFScore,
  // checkDropEventsAndNotifs,
} from '../lib/qf-calculate.js'

async function main() {
  const args = process.argv.slice(2)
  let mode: 'checkDropEventsAndNotifs' | 'calculateQFScore' = 'calculateQFScore'

  switch (args?.[0]) {
    case '--checkDropEventsAndNotifs':
    case '--calculateQFScore':
      mode = args?.[0].substring(2) as any
      args.shift()
      break
  }
  // if (mode === 'checkDropEventsAndNotifs') { return checkDropEventsAndNotifs() }

  const amountTotal = BigInt(+(args?.[0] || 10_000))

  // let fromTime: string | undefined, toTime: string | undefined;
  // let [fromTime, toTime] = args.length >= 0 ? [args?.[1] || '2023-10-01', args?.[2] || '2024-12-31T23:59:59.999Z'] : [undefined, undefined]
  // const [fromTime,toTime] = [Date.parse(from), Date.parse(to)];
  const fromBlock = BigInt(
    args?.[1] || 117_741_511n // the Round1 launch time "2024年3月22日 星期五 中午12:30 [台北標準時間]"
  )
  const toBlock = args?.[2]
    ? BigInt(
        args?.[2] // a big block number in long future
      )
    : undefined

  const res = await calculateQFScore({
    fromBlock,
    toBlock,
    amountTotal,
    write_gist: true, // for server side running output;
  })
  console.log(new Date(), 'res:', res)
}

main().catch((err) => console.error(new Date(), 'ERROR:', err))
