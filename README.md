# jsxrun

Run a single JSX file as a React app — no setup required.

```
npx jsxrun app.jsx
```

## Install

```
npm i -g jsxrun
```

## Usage

```
jsxrun <file.jsx|tsx> [options]
```

Your file must have a **default export** of a React component:

```jsx
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

Then run it:

```
jsxrun app.jsx
```

Open http://localhost:3000 and you're done.

## Options

| Flag | Description |
| --- | --- |
| `-p, --port <number>` | Port to serve on (default: 3000) |
| `-o, --open` | Open in browser automatically |
| `-b, --build` | Output a single `.html` file instead of starting a server |
| `-h, --help` | Show help |

## Build a single HTML file

```
jsxrun app.jsx --build
```

Outputs `app.html` — a self-contained file you can open directly in a browser or share. No server needed.

## How it works

- **esbuild** bundles your JSX on-the-fly
- **React 19** is loaded from esm.sh via importmap (no local install needed)
- **Live-reload** via SSE — edit your file, browser refreshes automatically
- **`--build`** inlines your bundled JS into a single HTML file
- Supports `.jsx` and `.tsx` files

## License

MIT
