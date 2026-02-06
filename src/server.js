import { createServer } from "node:http";
import { readFile, watch } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { build } from "esbuild";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function htmlShell(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime"
    }
  }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/__bundle.js"></script>
  <script>
    // Live-reload via SSE
    const es = new EventSource("/__reload");
    es.onmessage = () => location.reload();
  </script>
</body>
</html>`;
}

export async function buildHTML({ entry, out }) {
  const entryDir = dirname(entry);
  const title = entry.split("/").pop().replace(/\.(jsx|tsx)$/i, "");
  const outFile = out || resolve(process.cwd(), title + ".html");

  const result = await build({
    stdin: {
      contents: `
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Mod from ${JSON.stringify(entry)};

const root = createRoot(document.getElementById("root"));
const App = Mod && Mod.default ? Mod.default : Mod;
root.render(createElement(App));
`,
      resolveDir: entryDir,
      loader: entry.endsWith(".tsx") ? "tsx" : "jsx",
    },
    bundle: true,
    format: "esm",
    jsx: "automatic",
    write: false,
    external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
  });

  const js = result.outputFiles[0].text;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19",
      "react-dom": "https://esm.sh/react-dom@19",
      "react-dom/client": "https://esm.sh/react-dom@19/client",
      "react/jsx-runtime": "https://esm.sh/react@19/jsx-runtime"
    }
  }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module">${js}</script>
</body>
</html>`;

  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`\n  Built: ${outFile}\n`);
}

export async function startServer({ entry, port, open }) {
  const entryDir = dirname(entry);
  const title = entry.split("/").pop().replace(/\.(jsx|tsx)$/i, "");

  // SSE clients for live-reload
  const clients = new Set();

  function notifyClients() {
    for (const res of clients) {
      res.write("data: reload\n\n");
    }
  }

  // Watch the entry file's directory for changes
  const watcher = watch(entryDir, { recursive: true }, (eventType, filename) => {
    if (filename && /\.(jsx|tsx)$/i.test(filename)) {
      notifyClients();
    }
  });

  // Cache the bundle — rebuild on each request to /__bundle.js (fast with esbuild)
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === "/__reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(":\n\n"); // heartbeat
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(htmlShell(title));
      return;
    }

    if (url.pathname === "/__bundle.js") {
      try {
        // Build a tiny entry that imports the user file and renders it
        const code = await build({
          stdin: {
            contents: `
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Mod from ${JSON.stringify(entry)};

const root = createRoot(document.getElementById("root"));
const App = Mod && Mod.default ? Mod.default : Mod;
root.render(createElement(App));
`,
            resolveDir: entryDir,
            loader: entry.endsWith(".tsx") ? "tsx" : "jsx",
          },
          bundle: true,
          format: "esm",
          jsx: "automatic",
          write: false,
          external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
        });
        res.writeHead(200, {
          "Content-Type": "text/javascript",
          "Cache-Control": "no-store",
        });
        res.end(code.outputFiles[0].text);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/javascript" });
        res.end(`console.error(${JSON.stringify("Build error:\\n" + err.message)});`);
      }
      return;
    }

    // Serve static files from entry directory
    const filePath = resolve(entryDir, url.pathname.slice(1));
    if (!filePath.startsWith(entryDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n  jsxrun dev server\n`);
    console.log(`  Entry:  ${entry}`);
    console.log(`  Local:  ${url}\n`);

    if (open) {
      const cmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      import("node:child_process").then(({ exec }) => exec(`${cmd} ${url}`));
    }
  });

  process.on("SIGINT", () => {
    watcher.close();
    server.close();
    process.exit(0);
  });
}
