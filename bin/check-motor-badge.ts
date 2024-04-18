#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import { checkMotorBadge } from '../lib/check-motor-badge.js'

async function main() {
  const args = process.argv.slice(2)
  const threshold = Number.parseInt(args[0], 10) || 100

  await checkMotorBadge(threshold)
}

main().catch((err) => console.error(new Date(), 'ERROR:', err))
