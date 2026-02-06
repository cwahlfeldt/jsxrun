#!/usr/bin/env node

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { startServer, buildHTML } from "../src/server.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: "string", short: "p", default: "3000" },
    open: { type: "boolean", short: "o", default: false },
    build: { type: "boolean", short: "b", default: false },
    out: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
jsxrun - Run a single JSX file as a React app

Usage:
  jsxrun <file.jsx|tsx> [options]

Options:
  -p, --port <number>  Port to serve on (default: 3000)
  -o, --open           Open in browser automatically
  -b, --build          Output a single .html file instead of starting a server
      --out <path>     Output path for --build (default: <name>.html)
  -h, --help           Show this help message

Examples:
  jsxrun app.jsx
  jsxrun app.jsx --port 8080
  jsxrun app.jsx --open
  jsxrun app.jsx --build
  jsxrun app.jsx --build --out dist/app.html
`);
  process.exit(values.help ? 0 : 1);
}

const entry = resolve(positionals[0]);

if (!existsSync(entry)) {
  console.error(`Error: file not found: ${positionals[0]}`);
  process.exit(1);
}

if (!/\.(jsx|tsx)$/i.test(entry)) {
  console.error(`Error: file must be a .jsx or .tsx file`);
  process.exit(1);
}

if (values.build) {
  const out = values.out ? resolve(values.out) : undefined;
  buildHTML({ entry, out });
} else {
  const port = parseInt(values.port, 10);
  startServer({ entry, port, open: values.open });
}
