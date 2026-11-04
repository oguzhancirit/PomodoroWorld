// "Yılan" break game (user 2026-11-04, replaces Pomo Canavarları): the snake moves square by square, eats the food
// and its tail grows by one. Hitting a wall or its own body ends the game. Pure rules, the screen lives in the client.
export type SnakeDir = 'up' | 'down' | 'left' | 'right';
export interface SnakePt { x: number; y: number }
export interface SnakeGame {
  w: number; h: number;
  /** head first */
  body: SnakePt[];
  /** the way it moved last step, and the way it will move next step (a key press only changes `next`) */
  dir: SnakeDir; next: SnakeDir;
  food: SnakePt; score: number; over: boolean;
}

const STEP: Record<SnakeDir, SnakePt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const BACK: Record<SnakeDir, SnakeDir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const same = (a: SnakePt, b: SnakePt) => a.x === b.x && a.y === b.y;

/** a random free square (one the snake does not cover); `rnd` returns 0..1 */
export function placeFood(body: SnakePt[], w: number, h: number, rnd: () => number): SnakePt {
  const free: SnakePt[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!body.some((p) => p.x === x && p.y === y)) free.push({ x, y });
  if (!free.length) return { x: -1, y: -1 };
  return free[Math.min(free.length - 1, Math.floor(rnd() * free.length))];
}

export function newSnake(w: number, h: number, rnd: () => number): SnakeGame {
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  const body = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  return { w, h, body, dir: 'right', next: 'right', food: placeFood(body, w, h, rnd), score: 0, over: false };
}

/** a key press: ignored when it would turn the snake straight back into itself */
export function turnSnake(g: SnakeGame, d: SnakeDir): SnakeGame {
  if (g.over || d === BACK[g.dir]) return g;
  return { ...g, next: d };
}

export function stepSnake(g: SnakeGame, rnd: () => number): SnakeGame {
  if (g.over) return g;
  const dir = g.next, s = STEP[dir], head = { x: g.body[0].x + s.x, y: g.body[0].y + s.y };
  if (head.x < 0 || head.y < 0 || head.x >= g.w || head.y >= g.h) return { ...g, dir, over: true };
  const eats = same(head, g.food);
  // the tail moves away this step unless the snake is growing, so its square is free to enter
  const rest = eats ? g.body : g.body.slice(0, -1);
  if (rest.some((p) => same(p, head))) return { ...g, dir, over: true };
  const body = [head, ...rest];
  if (!eats) return { ...g, body, dir };
  const food = placeFood(body, g.w, g.h, rnd);
  return { ...g, body, dir, food, score: g.score + 1, over: food.x < 0 };
}

/** milliseconds between steps: starts calm, speeds up a little with every bite */
export const snakeDelay = (score: number) => Math.max(65, Math.round(150 - score * 4));
