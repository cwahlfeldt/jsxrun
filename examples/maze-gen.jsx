import { useState, useRef, useCallback, useEffect } from "react";

// ─── Maze Data Structure ──────────────────────────────────────────────
// Each cell stores walls: { top, right, bottom, left }
function createGrid(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        top: true,
        right: true,
        bottom: true,
        left: true,
        visited: false,
      };
    }
  }
  return grid;
}

function cloneGrid(grid) {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

// ─── Generation Algorithms (step-based) ──────────────────────────────
function* recursiveBacktracker(rows, cols) {
  const grid = createGrid(rows, cols);
  const stack = [];
  const start = { r: 0, c: 0 };
  grid[0][0].visited = true;
  stack.push(start);

  const neighbors = (r, c) => {
    const n = [];
    if (r > 0 && !grid[r - 1][c].visited) n.push({ r: r - 1, c, dir: "top" });
    if (r < rows - 1 && !grid[r + 1][c].visited)
      n.push({ r: r + 1, c, dir: "bottom" });
    if (c > 0 && !grid[r][c - 1].visited) n.push({ r, c: c - 1, dir: "left" });
    if (c < cols - 1 && !grid[r][c + 1].visited)
      n.push({ r, c: c + 1, dir: "right" });
    return n;
  };

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const nb = neighbors(current.r, current.c);
    if (nb.length === 0) {
      stack.pop();
      continue;
    }
    const next = nb[Math.floor(Math.random() * nb.length)];
    // Remove walls
    if (next.dir === "top") {
      grid[current.r][current.c].top = false;
      grid[next.r][next.c].bottom = false;
    }
    if (next.dir === "bottom") {
      grid[current.r][current.c].bottom = false;
      grid[next.r][next.c].top = false;
    }
    if (next.dir === "left") {
      grid[current.r][current.c].left = false;
      grid[next.r][next.c].right = false;
    }
    if (next.dir === "right") {
      grid[current.r][current.c].right = false;
      grid[next.r][next.c].left = false;
    }
    grid[next.r][next.c].visited = true;
    stack.push({ r: next.r, c: next.c });
    yield {
      grid: cloneGrid(grid),
      current: { r: next.r, c: next.c },
      stack: [...stack],
    };
  }
  // Reset visited
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid[r][c].visited = false;
  yield { grid: cloneGrid(grid), current: null, stack: [], done: true };
}

function* primsAlgorithm(rows, cols) {
  const grid = createGrid(rows, cols);
  const inMaze = Array.from({ length: rows }, () => Array(cols).fill(false));
  const frontier = [];

  const addFrontier = (r, c) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols && !inMaze[r][c]) {
      if (!frontier.some((f) => f.r === r && f.c === c))
        frontier.push({ r, c });
    }
  };

  const sr = Math.floor(Math.random() * rows);
  const sc = Math.floor(Math.random() * cols);
  inMaze[sr][sc] = true;
  grid[sr][sc].visited = true;
  addFrontier(sr - 1, sc);
  addFrontier(sr + 1, sc);
  addFrontier(sr, sc - 1);
  addFrontier(sr, sc + 1);

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const cell = frontier.splice(idx, 1)[0];
    const { r, c } = cell;

    const mazeNeighbors = [];
    if (r > 0 && inMaze[r - 1][c])
      mazeNeighbors.push({ r: r - 1, c, dir: "top" });
    if (r < rows - 1 && inMaze[r + 1][c])
      mazeNeighbors.push({ r: r + 1, c, dir: "bottom" });
    if (c > 0 && inMaze[r][c - 1])
      mazeNeighbors.push({ r, c: c - 1, dir: "left" });
    if (c < cols - 1 && inMaze[r][c + 1])
      mazeNeighbors.push({ r, c: c + 1, dir: "right" });

    if (mazeNeighbors.length > 0) {
      const nb =
        mazeNeighbors[Math.floor(Math.random() * mazeNeighbors.length)];
      if (nb.dir === "top") {
        grid[r][c].top = false;
        grid[nb.r][nb.c].bottom = false;
      }
      if (nb.dir === "bottom") {
        grid[r][c].bottom = false;
        grid[nb.r][nb.c].top = false;
      }
      if (nb.dir === "left") {
        grid[r][c].left = false;
        grid[nb.r][nb.c].right = false;
      }
      if (nb.dir === "right") {
        grid[r][c].right = false;
        grid[nb.r][nb.c].left = false;
      }
      inMaze[r][c] = true;
      grid[r][c].visited = true;
      addFrontier(r - 1, c);
      addFrontier(r + 1, c);
      addFrontier(r, c - 1);
      addFrontier(r, c + 1);
    }
    yield {
      grid: cloneGrid(grid),
      current: { r, c },
      stack: frontier.map((f) => ({ ...f })),
    };
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid[r][c].visited = false;
  yield { grid: cloneGrid(grid), current: null, stack: [], done: true };
}

function* kruskalsAlgorithm(rows, cols) {
  const grid = createGrid(rows, cols);
  const parent = {};
  const key = (r, c) => `${r},${c}`;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) parent[key(r, c)] = key(r, c);

  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    parent[find(a)] = find(b);
  };

  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < rows - 1)
        edges.push({ r1: r, c1: c, r2: r + 1, c2: c, dir: "bottom" });
      if (c < cols - 1)
        edges.push({ r1: r, c1: c, r2: r, c2: c + 1, dir: "right" });
    }
  }
  // Shuffle
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  for (const edge of edges) {
    const a = key(edge.r1, edge.c1),
      b = key(edge.r2, edge.c2);
    if (find(a) !== find(b)) {
      union(a, b);
      if (edge.dir === "bottom") {
        grid[edge.r1][edge.c1].bottom = false;
        grid[edge.r2][edge.c2].top = false;
      }
      if (edge.dir === "right") {
        grid[edge.r1][edge.c1].right = false;
        grid[edge.r2][edge.c2].left = false;
      }
      grid[edge.r1][edge.c1].visited = true;
      grid[edge.r2][edge.c2].visited = true;
      yield {
        grid: cloneGrid(grid),
        current: { r: edge.r2, c: edge.c2 },
        stack: [],
      };
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid[r][c].visited = false;
  yield { grid: cloneGrid(grid), current: null, stack: [], done: true };
}

function* binaryTree(rows, cols) {
  const grid = createGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const choices = [];
      if (r > 0) choices.push("top");
      if (c > 0) choices.push("left");
      if (choices.length > 0) {
        const dir = choices[Math.floor(Math.random() * choices.length)];
        if (dir === "top") {
          grid[r][c].top = false;
          grid[r - 1][c].bottom = false;
        }
        if (dir === "left") {
          grid[r][c].left = false;
          grid[r][c - 1].right = false;
        }
      }
      grid[r][c].visited = true;
      yield { grid: cloneGrid(grid), current: { r, c }, stack: [] };
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid[r][c].visited = false;
  yield { grid: cloneGrid(grid), current: null, stack: [], done: true };
}

function* sidewinder(rows, cols) {
  const grid = createGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    let run = [];
    for (let c = 0; c < cols; c++) {
      run.push({ r, c });
      const atEast = c === cols - 1;
      const atNorth = r === 0;
      const shouldClose = atEast || (!atNorth && Math.random() < 0.5);

      if (shouldClose) {
        if (!atNorth) {
          const cell = run[Math.floor(Math.random() * run.length)];
          grid[cell.r][cell.c].top = false;
          grid[cell.r - 1][cell.c].bottom = false;
        }
        run = [];
      } else {
        grid[r][c].right = false;
        grid[r][c + 1].left = false;
      }
      grid[r][c].visited = true;
      yield { grid: cloneGrid(grid), current: { r, c }, stack: [] };
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) grid[r][c].visited = false;
  yield { grid: cloneGrid(grid), current: null, stack: [], done: true };
}

// ─── Solving Algorithms (step-based) ──────────────────────────────────
function getPassableNeighbors(grid, r, c, rows, cols) {
  const n = [];
  if (!grid[r][c].top && r > 0) n.push({ r: r - 1, c });
  if (!grid[r][c].bottom && r < rows - 1) n.push({ r: r + 1, c });
  if (!grid[r][c].left && c > 0) n.push({ r, c: c - 1 });
  if (!grid[r][c].right && c < cols - 1) n.push({ r, c: c + 1 });
  return n;
}

function* solveBFS(grid, rows, cols, start, end) {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const queue = [start];
  visited[start.r][start.c] = true;
  const explored = [];

  while (queue.length > 0) {
    const curr = queue.shift();
    explored.push({ r: curr.r, c: curr.c });
    if (curr.r === end.r && curr.c === end.c) {
      // Trace path
      const path = [];
      let p = end;
      while (p) {
        path.unshift(p);
        p = prev[p.r][p.c];
      }
      yield { explored: [...explored], path, done: true };
      return;
    }
    for (const nb of getPassableNeighbors(grid, curr.r, curr.c, rows, cols)) {
      if (!visited[nb.r][nb.c]) {
        visited[nb.r][nb.c] = true;
        prev[nb.r][nb.c] = { r: curr.r, c: curr.c };
        queue.push(nb);
      }
    }
    yield { explored: [...explored], path: [] };
  }
}

function* solveDFS(grid, rows, cols, start, end) {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const stack = [start];
  const explored = [];

  while (stack.length > 0) {
    const curr = stack.pop();
    if (visited[curr.r][curr.c]) continue;
    visited[curr.r][curr.c] = true;
    explored.push({ r: curr.r, c: curr.c });
    if (curr.r === end.r && curr.c === end.c) {
      const path = [];
      let p = end;
      while (p) {
        path.unshift(p);
        p = prev[p.r][p.c];
      }
      yield { explored: [...explored], path, done: true };
      return;
    }
    for (const nb of getPassableNeighbors(grid, curr.r, curr.c, rows, cols)) {
      if (!visited[nb.r][nb.c]) {
        prev[nb.r][nb.c] = { r: curr.r, c: curr.c };
        stack.push(nb);
      }
    }
    yield { explored: [...explored], path: [] };
  }
}

function* solveAStar(grid, rows, cols, start, end) {
  const h = (r, c) => Math.abs(r - end.r) + Math.abs(c - end.c);
  const gScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const fScore = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const closed = Array.from({ length: rows }, () => Array(cols).fill(false));
  gScore[start.r][start.c] = 0;
  fScore[start.r][start.c] = h(start.r, start.c);
  const open = [{ r: start.r, c: start.c, f: fScore[start.r][start.c] }];
  const explored = [];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const curr = open.shift();
    if (closed[curr.r][curr.c]) continue;
    closed[curr.r][curr.c] = true;
    explored.push({ r: curr.r, c: curr.c });

    if (curr.r === end.r && curr.c === end.c) {
      const path = [];
      let p = end;
      while (p) {
        path.unshift(p);
        p = prev[p.r][p.c];
      }
      yield { explored: [...explored], path, done: true };
      return;
    }
    for (const nb of getPassableNeighbors(grid, curr.r, curr.c, rows, cols)) {
      if (closed[nb.r][nb.c]) continue;
      const tentG = gScore[curr.r][curr.c] + 1;
      if (tentG < gScore[nb.r][nb.c]) {
        prev[nb.r][nb.c] = { r: curr.r, c: curr.c };
        gScore[nb.r][nb.c] = tentG;
        fScore[nb.r][nb.c] = tentG + h(nb.r, nb.c);
        open.push({ r: nb.r, c: nb.c, f: fScore[nb.r][nb.c] });
      }
    }
    yield { explored: [...explored], path: [] };
  }
}

// ─── Render to Canvas ─────────────────────────────────────────────────
function renderMaze(ctx, grid, rows, cols, cellSize, wallWidth, state = {}) {
  const { explored = [], path = [], genCurrent = null, genStack = [] } = state;
  const w = cols * cellSize + wallWidth;
  const h = rows * cellSize + wallWidth;

  ctx.clearRect(0, 0, w, h);

  // BG
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  // Visited cells (generation)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].visited) {
        ctx.fillStyle = "#161b22";
        ctx.fillRect(
          c * cellSize + wallWidth,
          r * cellSize + wallWidth,
          cellSize - wallWidth,
          cellSize - wallWidth,
        );
      }
    }
  }

  // Explored cells (solving)
  for (const e of explored) {
    ctx.fillStyle = "rgba(88, 166, 255, 0.15)";
    ctx.fillRect(
      e.c * cellSize + wallWidth,
      e.r * cellSize + wallWidth,
      cellSize - wallWidth,
      cellSize - wallWidth,
    );
  }

  // Solution path
  if (path.length > 1) {
    ctx.strokeStyle = "#f78166";
    ctx.lineWidth = Math.max(cellSize * 0.25, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const half = cellSize / 2;
    ctx.moveTo(
      path[0].c * cellSize + half + wallWidth / 2,
      path[0].r * cellSize + half + wallWidth / 2,
    );
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(
        path[i].c * cellSize + half + wallWidth / 2,
        path[i].r * cellSize + half + wallWidth / 2,
      );
    }
    ctx.stroke();
  }

  // Start/End markers
  if (grid.length > 0) {
    const half = cellSize / 2;
    const mr = cellSize * 0.25;
    // Start
    ctx.fillStyle = "#3fb950";
    ctx.beginPath();
    ctx.arc(
      0 * cellSize + half + wallWidth / 2,
      0 * cellSize + half + wallWidth / 2,
      mr,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    // End
    ctx.fillStyle = "#f85149";
    ctx.beginPath();
    ctx.arc(
      (cols - 1) * cellSize + half + wallWidth / 2,
      (rows - 1) * cellSize + half + wallWidth / 2,
      mr,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Generation current cell
  if (genCurrent) {
    ctx.fillStyle = "rgba(210, 153, 34, 0.5)";
    ctx.fillRect(
      genCurrent.c * cellSize + wallWidth,
      genCurrent.r * cellSize + wallWidth,
      cellSize - wallWidth,
      cellSize - wallWidth,
    );
  }

  // Walls
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = wallWidth;
  ctx.lineCap = "round";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellSize + wallWidth / 2;
      const y = r * cellSize + wallWidth / 2;
      if (grid[r][c].top) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.stroke();
      }
      if (grid[r][c].right) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
      if (grid[r][c].bottom) {
        ctx.beginPath();
        ctx.moveTo(x, y + cellSize);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
      if (grid[r][c].left) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cellSize);
        ctx.stroke();
      }
    }
  }
}

// ─── Render to SVG string ─────────────────────────────────────────────
function renderMazeToSVG(
  grid,
  rows,
  cols,
  cellSize,
  wallWidth,
  solveState = {},
) {
  const { explored = [], path = [] } = solveState;
  const w = cols * cellSize + wallWidth;
  const h = rows * cellSize + wallWidth;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  svg += `<rect width="${w}" height="${h}" fill="#0d1117"/>`;

  // Explored
  for (const e of explored) {
    svg += `<rect x="${e.c * cellSize + wallWidth}" y="${e.r * cellSize + wallWidth}" width="${cellSize - wallWidth}" height="${cellSize - wallWidth}" fill="rgba(88,166,255,0.15)"/>`;
  }

  // Path
  if (path.length > 1) {
    const half = cellSize / 2;
    const hw = wallWidth / 2;
    let d = `M${path[0].c * cellSize + half + hw} ${path[0].r * cellSize + half + hw}`;
    for (let i = 1; i < path.length; i++)
      d += ` L${path[i].c * cellSize + half + hw} ${path[i].r * cellSize + half + hw}`;
    svg += `<path d="${d}" stroke="#f78166" stroke-width="${Math.max(cellSize * 0.25, 2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }

  // Start/End
  const half = cellSize / 2;
  const hw = wallWidth / 2;
  const mr = cellSize * 0.25;
  svg += `<circle cx="${half + hw}" cy="${half + hw}" r="${mr}" fill="#3fb950"/>`;
  svg += `<circle cx="${(cols - 1) * cellSize + half + hw}" cy="${(rows - 1) * cellSize + half + hw}" r="${mr}" fill="#f85149"/>`;

  // Walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellSize + hw;
      const y = r * cellSize + hw;
      const cell = grid[r][c];
      if (cell.top)
        svg += `<line x1="${x}" y1="${y}" x2="${x + cellSize}" y2="${y}" stroke="#30363d" stroke-width="${wallWidth}" stroke-linecap="round"/>`;
      if (cell.right)
        svg += `<line x1="${x + cellSize}" y1="${y}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="#30363d" stroke-width="${wallWidth}" stroke-linecap="round"/>`;
      if (cell.bottom)
        svg += `<line x1="${x}" y1="${y + cellSize}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="#30363d" stroke-width="${wallWidth}" stroke-linecap="round"/>`;
      if (cell.left)
        svg += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cellSize}" stroke="#30363d" stroke-width="${wallWidth}" stroke-linecap="round"/>`;
    }
  }

  svg += `</svg>`;
  return svg;
}

// ─── Main App ─────────────────────────────────────────────────────────
const GENERATORS = {
  "Recursive Backtracker": recursiveBacktracker,
  "Prim's Algorithm": primsAlgorithm,
  "Kruskal's Algorithm": kruskalsAlgorithm,
  "Binary Tree": binaryTree,
  Sidewinder: sidewinder,
};

const SOLVERS = {
  "BFS (Breadth-First)": solveBFS,
  "DFS (Depth-First)": solveDFS,
  "A* Search": solveAStar,
};

const ALGO_DESCRIPTIONS = {
  "Recursive Backtracker":
    "Creates long, winding corridors with few dead ends. Uses DFS with backtracking.",
  "Prim's Algorithm":
    "Grows outward from a random point, creating shorter dead ends and a more uniform texture.",
  "Kruskal's Algorithm":
    "Randomly connects cells by merging sets — produces organic, scattered patterns.",
  "Binary Tree":
    "Fast and simple. Each cell connects north or west. Creates a strong diagonal bias.",
  Sidewinder:
    "Row-by-row generation. Similar to Binary Tree but with horizontal runs.",
  "BFS (Breadth-First)":
    "Explores all neighbors level by level. Guarantees the shortest path.",
  "DFS (Depth-First)":
    "Dives deep before backtracking. Finds a path quickly but not necessarily shortest.",
  "A* Search":
    "Uses heuristics to find the shortest path efficiently. Best of both worlds.",
};

const SPEEDS = { Slow: 60, Medium: 15, Fast: 2, Instant: 0 };

export default function MazeApp() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(20);
  const [genAlgo, setGenAlgo] = useState("Recursive Backtracker");
  const [solveAlgo, setSolveAlgo] = useState("BFS (Breadth-First)");
  const [speed, setSpeed] = useState("Fast");
  const [cellSize, setCellSize] = useState(24);
  const [wallWidth, setWallWidth] = useState(2);
  const [grid, setGrid] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveState, setSolveState] = useState({ explored: [], path: [] });
  const [genState, setGenState] = useState({ current: null, stack: [] });
  const [stats, setStats] = useState(null);

  const gridRef = useRef(grid);
  const solveStateRef = useRef(solveState);
  const genStateRef = useRef(genState);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    solveStateRef.current = solveState;
  }, [solveState]);
  useEffect(() => {
    genStateRef.current = genState;
  }, [genState]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;
    const ctx = canvas.getContext("2d");
    renderMaze(
      ctx,
      gridRef.current,
      gridRef.current.length,
      gridRef.current[0].length,
      cellSize,
      wallWidth,
      {
        explored: solveStateRef.current.explored,
        path: solveStateRef.current.path,
        genCurrent: genStateRef.current.current,
        genStack: genStateRef.current.stack,
      },
    );
  }, [cellSize, wallWidth]);

  useEffect(() => {
    draw();
  }, [grid, solveState, genState, draw]);

  const stopAnimation = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
  }, []);

  const generate = useCallback(() => {
    stopAnimation();
    setIsSolving(false);
    setIsGenerating(true);
    setSolveState({ explored: [], path: [] });
    setGenState({ current: null, stack: [] });
    setStats(null);

    const gen = GENERATORS[genAlgo](rows, cols);
    const delay = SPEEDS[speed];
    const startTime = performance.now();

    if (delay === 0) {
      let last;
      for (const step of gen) last = step;
      if (last) {
        setGrid(last.grid);
        setGenState({ current: null, stack: [] });
      }
      setIsGenerating(false);
      setStats({ genTime: Math.round(performance.now() - startTime) });
      return;
    }

    const step = () => {
      const next = gen.next();
      if (next.done || next.value.done) {
        if (next.value) setGrid(next.value.grid);
        setGenState({ current: null, stack: [] });
        setIsGenerating(false);
        setStats({ genTime: Math.round(performance.now() - startTime) });
        return;
      }
      setGrid(next.value.grid);
      setGenState({
        current: next.value.current,
        stack: next.value.stack || [],
      });
      animRef.current = setTimeout(step, delay);
    };
    step();
  }, [genAlgo, rows, cols, speed, stopAnimation]);

  const solve = useCallback(() => {
    if (!grid || isGenerating) return;
    stopAnimation();
    setIsSolving(true);
    setSolveState({ explored: [], path: [] });

    const r = grid.length,
      c = grid[0].length;
    const start = { r: 0, c: 0 },
      end = { r: r - 1, c: c - 1 };
    const solver = SOLVERS[solveAlgo](grid, r, c, start, end);
    const delay = SPEEDS[speed];
    const startTime = performance.now();

    if (delay === 0) {
      let last;
      for (const step of solver) last = step;
      if (last) setSolveState(last);
      setIsSolving(false);
      setStats((prev) => ({
        ...prev,
        solveTime: Math.round(performance.now() - startTime),
        explored: last?.explored?.length || 0,
        pathLen: last?.path?.length || 0,
      }));
      return;
    }

    const step = () => {
      const next = solver.next();
      if (next.done || next.value.done) {
        if (next.value) setSolveState(next.value);
        setIsSolving(false);
        setStats((prev) => ({
          ...prev,
          solveTime: Math.round(performance.now() - startTime),
          explored: next.value?.explored?.length || 0,
          pathLen: next.value?.path?.length || 0,
        }));
        return;
      }
      setSolveState(next.value);
      animRef.current = setTimeout(step, delay);
    };
    step();
  }, [grid, solveAlgo, speed, isGenerating, stopAnimation]);

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "maze.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const exportSVG = useCallback(() => {
    if (!grid) return;
    const svgStr = renderMazeToSVG(
      grid,
      grid.length,
      grid[0].length,
      cellSize,
      wallWidth,
      solveState,
    );
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "maze.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
  }, [grid, cellSize, wallWidth, solveState]);

  const canvasW = cols * cellSize + wallWidth;
  const canvasH = rows * cellSize + wallWidth;
  const busy = isGenerating || isSolving;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#c9d1d9",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: "linear-gradient(135deg, #f78166, #d29922, #3fb950)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 900,
            color: "#0d1117",
          }}
        >
          M
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#f0f6fc",
              letterSpacing: "-0.02em",
            }}
          >
            Maze Lab
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#484f58",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Generate · Solve · Export
          </p>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 300,
            minWidth: 300,
            borderRight: "1px solid #21262d",
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Grid Size */}
          <Section title="Grid">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <SliderField
                label="Rows"
                value={rows}
                min={5}
                max={60}
                onChange={(v) => setRows(v)}
                disabled={busy}
              />
              <SliderField
                label="Cols"
                value={cols}
                min={5}
                max={60}
                onChange={(v) => setCols(v)}
                disabled={busy}
              />
              <SliderField
                label="Cell"
                value={cellSize}
                min={8}
                max={40}
                onChange={(v) => setCellSize(v)}
                suffix="px"
              />
              <SliderField
                label="Wall"
                value={wallWidth}
                min={1}
                max={6}
                onChange={(v) => setWallWidth(v)}
                suffix="px"
              />
            </div>
          </Section>

          {/* Generation */}
          <Section title="Generation">
            <SelectField
              value={genAlgo}
              options={Object.keys(GENERATORS)}
              onChange={setGenAlgo}
              disabled={busy}
            />
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "#484f58",
                lineHeight: 1.5,
              }}
            >
              {ALGO_DESCRIPTIONS[genAlgo]}
            </p>
          </Section>

          {/* Solving */}
          <Section title="Solving">
            <SelectField
              value={solveAlgo}
              options={Object.keys(SOLVERS)}
              onChange={setSolveAlgo}
              disabled={busy}
            />
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "#484f58",
                lineHeight: 1.5,
              }}
            >
              {ALGO_DESCRIPTIONS[solveAlgo]}
            </p>
          </Section>

          {/* Speed */}
          <Section title="Speed">
            <div style={{ display: "flex", gap: 6 }}>
              {Object.keys(SPEEDS).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    border: "1px solid",
                    fontSize: 11,
                    borderColor: speed === s ? "#58a6ff" : "#30363d",
                    background:
                      speed === s ? "rgba(88,166,255,0.1)" : "transparent",
                    color: speed === s ? "#58a6ff" : "#8b949e",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </Section>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ActionButton
              onClick={generate}
              disabled={busy}
              color="#3fb950"
              label={isGenerating ? "Generating…" : "Generate Maze"}
            />
            <ActionButton
              onClick={solve}
              disabled={busy || !grid}
              color="#58a6ff"
              label={isSolving ? "Solving…" : "Solve Maze"}
            />
            {busy && (
              <ActionButton
                onClick={stopAnimation}
                color="#f85149"
                label="Stop"
              />
            )}
          </div>

          {/* Export */}
          <Section title="Export">
            <div style={{ display: "flex", gap: 8 }}>
              <ActionButton
                onClick={exportPNG}
                disabled={!grid}
                color="#d29922"
                label="PNG"
                small
              />
              <ActionButton
                onClick={exportSVG}
                disabled={!grid}
                color="#d29922"
                label="SVG"
                small
              />
            </div>
          </Section>

          {/* Stats */}
          {stats && (
            <Section title="Stats">
              <div style={{ fontSize: 12, lineHeight: 1.8, color: "#8b949e" }}>
                {stats.genTime != null && (
                  <div>
                    Generation:{" "}
                    <span style={{ color: "#c9d1d9" }}>{stats.genTime}ms</span>
                  </div>
                )}
                {stats.solveTime != null && (
                  <div>
                    Solve:{" "}
                    <span style={{ color: "#c9d1d9" }}>
                      {stats.solveTime}ms
                    </span>
                  </div>
                )}
                {stats.explored != null && (
                  <div>
                    Explored:{" "}
                    <span style={{ color: "#58a6ff" }}>{stats.explored}</span>{" "}
                    cells
                  </div>
                )}
                {stats.pathLen != null && (
                  <div>
                    Path length:{" "}
                    <span style={{ color: "#f78166" }}>{stats.pathLen}</span>{" "}
                    cells
                  </div>
                )}
                <div>
                  Grid:{" "}
                  <span style={{ color: "#c9d1d9" }}>
                    {rows}×{cols}
                  </span>{" "}
                  ({rows * cols} cells)
                </div>
              </div>
            </Section>
          )}
        </aside>

        {/* Canvas Area */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: 32,
            background:
              "radial-gradient(ellipse at center, #161b22 0%, #0d1117 70%)",
          }}
        >
          {!grid ? (
            <div style={{ textAlign: "center", color: "#484f58" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                ⬡
              </div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                No maze generated yet
              </div>
              <div style={{ fontSize: 12 }}>
                Click <span style={{ color: "#3fb950" }}>Generate Maze</span> to
                begin
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              style={{
                borderRadius: 8,
                boxShadow:
                  "0 0 60px rgba(88,166,255,0.04), 0 0 1px rgba(240,246,252,0.1)",
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Reusable UI Components ──────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#484f58",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "",
  disabled = false,
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#8b949e" }}>
        {label}:{" "}
        <strong style={{ color: "#c9d1d9" }}>
          {value}
          {suffix}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: "#58a6ff",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />
    </label>
  );
}

function SelectField({ value, options, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "8px 10px",
        fontSize: 12,
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 6,
        color: "#c9d1d9",
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ActionButton({ onClick, disabled, color, label, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: small ? 1 : undefined,
        padding: small ? "7px 12px" : "10px 16px",
        background: disabled ? "#21262d" : `${color}18`,
        border: `1px solid ${disabled ? "#30363d" : color}`,
        color: disabled ? "#484f58" : color,
        borderRadius: 8,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </button>
  );
}
