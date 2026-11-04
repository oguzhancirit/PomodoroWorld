import { describe, it, expect } from 'vitest';
import { newSnake, turnSnake, stepSnake, placeFood, snakeDelay, type SnakeGame } from '../src/snake';

const fixed = (v: number) => () => v; // a "random" that always returns v

describe('snake: start', () => {
  it('starts with 3 pieces in the middle, going right, food on a free square', () => {
    const g = newSnake(12, 10, fixed(0));
    expect(g.body).toHaveLength(3);
    expect(g.body[0]).toEqual({ x: 6, y: 5 });
    expect(g.body[1]).toEqual({ x: 5, y: 5 });
    expect(g.dir).toBe('right');
    expect(g.body.some((p) => p.x === g.food.x && p.y === g.food.y)).toBe(false);
    expect(g.score).toBe(0); expect(g.over).toBe(false);
  });
});

describe('snake: moving', () => {
  it('moves one square a step and keeps its length', () => {
    const g = stepSnake({ ...newSnake(12, 10, fixed(0)), food: { x: 0, y: 0 } }, fixed(0));
    expect(g.body[0]).toEqual({ x: 7, y: 5 });
    expect(g.body).toHaveLength(3);
  });
  it('turns, but cannot turn straight back into itself', () => {
    let g = newSnake(12, 10, fixed(0));
    g = turnSnake(g, 'left'); expect(g.next).toBe('right');
    g = turnSnake(g, 'up'); expect(g.next).toBe('up');
    g = stepSnake({ ...g, food: { x: 0, y: 0 } }, fixed(0));
    expect(g.body[0]).toEqual({ x: 6, y: 4 }); expect(g.dir).toBe('up');
  });
  it('two quick key presses in one step cannot reverse it either', () => {
    let g = newSnake(12, 10, fixed(0));
    g = turnSnake(g, 'up'); g = turnSnake(g, 'left'); // left would be fine after up, but up has not happened yet
    expect(g.next).toBe('up');
  });
});

describe('snake: eating', () => {
  it('eats the food: score goes up, the tail grows by one, new food appears elsewhere', () => {
    const g0 = { ...newSnake(12, 10, fixed(0)), food: { x: 7, y: 5 } };
    const g = stepSnake(g0, fixed(0));
    expect(g.score).toBe(1);
    expect(g.body).toHaveLength(4);
    expect(g.body[0]).toEqual({ x: 7, y: 5 });
    expect(g.body.some((p) => p.x === g.food.x && p.y === g.food.y)).toBe(false);
  });
  it('food never lands on the snake', () => {
    const body = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    for (const r of [0, 0.3, 0.99]) { const f = placeFood(body, 3, 2, fixed(r)); expect(f.y).toBe(1); }
  });
});

describe('snake: game over', () => {
  it('hitting the wall ends the game', () => {
    let g: SnakeGame = { ...newSnake(5, 5, fixed(0)), food: { x: 0, y: 0 } };
    for (let i = 0; i < 5; i++) g = stepSnake(g, fixed(0));
    expect(g.over).toBe(true);
  });
  it('biting its own body ends the game', () => {
    const g0: SnakeGame = { w: 10, h: 10, body: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }], dir: 'down', next: 'down', food: { x: 0, y: 0 }, score: 0, over: false };
    expect(stepSnake(g0, fixed(0)).over).toBe(true);
  });
  it('moving into the square the tail is leaving is fine', () => {
    const g0: SnakeGame = { w: 10, h: 10, body: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }], dir: 'down', next: 'down', food: { x: 0, y: 0 }, score: 0, over: false };
    const g = stepSnake(g0, fixed(0));
    expect(g.over).toBe(false); expect(g.body[0]).toEqual({ x: 5, y: 6 });
  });
  it('a finished game does not move any more', () => {
    const g0 = { ...newSnake(8, 8, fixed(0)), over: true };
    expect(stepSnake(g0, fixed(0))).toBe(g0);
  });
});

describe('snake: speed', () => {
  it('gets faster as the score grows, but never too fast', () => {
    expect(snakeDelay(10)).toBeLessThan(snakeDelay(0));
    expect(snakeDelay(1000)).toBeGreaterThanOrEqual(65);
  });
});
