#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

import { checkNomadBadge } from "../lib/check-nomad-badge.js";

async function main() {
  const args = process.argv.slice(2);

  await checkNomadBadge({ dryRun: true });
}

main().catch((err) => console.error(new Date(), "ERROR:", err));
