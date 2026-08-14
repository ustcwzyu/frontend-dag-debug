#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const [command, fileArg] = process.argv.slice(2);
if (!["inline-source", "file-source"].includes(command) || !fileArg) {
  console.error("Usage: node compute-source-identity.mjs <inline-source|file-source> <file>");
  process.exit(2);
}

const path = resolve(fileArg);
let body;
try {
  body = readFileSync(path);
} catch (error) {
  console.error(`Cannot read ${path}: ${error.message}`);
  process.exit(2);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (command === "inline-source") {
  console.log(`inline:sha256:${sha256(body)}`);
} else {
  let normalizedPath;
  try {
    normalizedPath = realpathSync(path);
  } catch (error) {
    console.error(`Cannot resolve source path ${path}: ${error.message}`);
    process.exit(2);
  }
  console.log(`file:sha256:${sha256(Buffer.concat([Buffer.from(normalizedPath), Buffer.from([0]), body]))}`);
}
