#!/usr/bin/env -S node --trace-warnings --loader ts-node/esm

// generate a stub file for each `handlers/*.ts`

import path from "node:path";
import { readdir, writeFile } from "node:fs/promises";

try {
  const files = await readdir("./handlers");
  for (const file of files) {
    // console.log(new Date, 'file:', file);
    if (file.endsWith(".ts")) {
      console.log(new Date(), "gen entry:", file);
      const base = path.basename(file, ".ts");
      await writeFile(file, `export * from "./handlers/${base}.js";`);
    }
  }
} catch (err) {
  console.error(err);
}
