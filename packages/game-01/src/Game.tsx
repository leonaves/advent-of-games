import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import { Share2, Play } from 'lucide-react';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

// Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const MIN_SPEED = 80;
const SPEED_DECREMENT = 2;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIRECTIONS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

// Seeded RNG
class SeededRNG {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0xdeadbeef;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 2654435761);
    }
    this.seed = (h ^ (h >>> 16)) >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Helper to check grid connectivity
function isConnected(walls: Point[], gridSize: number): boolean {
  const grid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(false));
  walls.forEach((w) => {
    if (w.x >= 0 && w.x < gridSize && w.y >= 0 && w.y < gridSize) {
      grid[w.y][w.x] = true;
    }
  });

  let start: Point | null = null;
  let freeCount = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!grid[y][x]) {
        freeCount++;
        if (!start) start = { x, y };
      }
    }
  }

  if (freeCount === 0) return false;
  if (!start) return false;

  const queue: Point[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  let visitedCount = 0;

  while (queue.length > 0) {
    const p = queue.shift()!;
    visitedCount++;

    const neighbors = [
      { x: p.x, y: p.y - 1 },
      { x: p.x, y: p.y + 1 },
      { x: p.x - 1, y: p.y },
      { x: p.x + 1, y: p.y },
    ];

    for (const n of neighbors) {
      const nx = (n.x + gridSize) % gridSize;
      const ny = (n.y + gridSize) % gridSize;

      if (!grid[ny][nx] && !visited.has(`${nx},${ny}`)) {
        visited.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return visitedCount === freeCount;
}

// Generate daily level
function generateLevel(seedStr: string): Point[] {
  let attempt = 0;

  while (attempt < 100) {
    const rng = new SeededRNG(`${seedStr}-${attempt}`);
    const generatedWalls: Point[] = [];
    const patternType = rng.nextInt(0, 3);

    if (patternType === 0) {
      const count = rng.nextInt(10, 25);
      for (let i = 0; i < count; i++) {
        generatedWalls.push({
          x: rng.nextInt(0, GRID_SIZE - 1),
          y: rng.nextInt(0, GRID_SIZE - 1),
        });
      }
    } else if (patternType === 1) {
      const isVertical = rng.next() > 0.5;
      const count = rng.nextInt(2, 4);
      for (let c = 0; c < count; c++) {
        const fixed = rng.nextInt(2, GRID_SIZE - 3);
        for (let i = 0; i < GRID_SIZE; i++) {
          if (rng.next() > 0.2) {
            generatedWalls.push(isVertical ? { x: fixed, y: i } : { x: i, y: fixed });
          }
        }
      }
    } else if (patternType === 2) {
      const inset = rng.nextInt(3, 6);
      for (let x = inset; x < GRID_SIZE - inset; x++) {
        generatedWalls.push({ x, y: inset });
        generatedWalls.push({ x, y: GRID_SIZE - inset - 1 });
      }
      for (let y = inset; y < GRID_SIZE - inset; y++) {
        generatedWalls.push({ x: inset, y });
        generatedWalls.push({ x: GRID_SIZE - inset - 1, y });
      }
      const gapCount = rng.nextInt(2, 4);
      for (let i = 0; i < gapCount; i++) {
        if (generatedWalls.length > 0) {
          const idx = rng.nextInt(0, generatedWalls.length - 1);
          generatedWalls.splice(idx, 1);
          if (idx < generatedWalls.length) generatedWalls.splice(idx, 1);
        }
      }
    } else {
      let x = Math.floor(GRID_SIZE / 2);
      let y = Math.floor(GRID_SIZE / 2);
      let steps = 1;
      let dir = 0;
      const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ];

      for (let i = 0; i < GRID_SIZE * 2; i++) {
        for (let s = 0; s < steps; s++) {
          x += dirs[dir].x;
          y += dirs[dir].y;
          if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            if (rng.next() > 0.3) {
              generatedWalls.push({ x, y });
            }
          }
        }
        dir = (dir + 1) % 4;
        if (i % 2 === 0) steps++;
      }
    }

    const finalWalls = generatedWalls.filter((w) => !(w.x === 10 && w.y >= 10 && w.y <= 12));

    if (isConnected(finalWalls, GRID_SIZE)) {
      return finalWalls;
    }

    attempt++;
  }

  return [];
}

// Board component
function Board({ snake, fruit, walls }: { snake: Point[]; fruit: Point | null; walls: Point[] }) {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
    x: i % GRID_SIZE,
    y: Math.floor(i / GRID_SIZE),
  }));

  return (
    <div
      className="border-neon-blue/30 shadow-neon-blue/20 grid gap-0.5 rounded-lg border-4 bg-gray-900 p-1 shadow-2xl"
      style={{
        gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        width: 'min(90vw, 500px)',
        aspectRatio: '1/1',
      }}
    >
      {cells.map((cell) => {
        const isSnakeHead = snake[0].x === cell.x && snake[0].y === cell.y;
        const isSnakeBody = snake.some(
          (s, index) => index !== 0 && s.x === cell.x && s.y === cell.y
        );
        const isFruit = fruit?.x === cell.x && fruit?.y === cell.y;
        const isWall = walls.some((w) => w.x === cell.x && w.y === cell.y);

        return (
          <div
            key={`${cell.x}-${cell.y}`}
            className={clsx('h-full w-full rounded-sm transition-all duration-100', {
              'bg-gray-950': !isSnakeBody && !isSnakeHead && !isFruit && !isWall,
              'bg-neon-green z-10 shadow-[0_0_10px_rgba(0,255,157,0.6)]': isSnakeHead,
              'bg-neon-green/70': isSnakeBody,
              'bg-neon-pink scale-75 animate-pulse rounded-full shadow-[0_0_10px_rgba(255,0,60,0.6)]':
                isFruit,
              'border-neon-purple/40 bg-neon-purple/30 border': isWall,
            })}
          />
        );
      })}
    </div>
  );
}

// useGameLoop hook
function useGameLoop(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => {
        savedCallback.current();
      }, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export function Game({ seed, onComplete }: GameProps) {
  const walls = useMemo(() => {
    const dateSeed = seed
      ? seed.toString()
      : `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
    return generateLevel(dateSeed);
  }, [seed]);

  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>('UP');
  const [isAlive, setIsAlive] = useState(true);
  const [fruit, setFruit] = useState<Point | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [gameState, setGameState] = useState<'START' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER'>(
    'START'
  );
  const [countdown, setCountdown] = useState(3);

  const touchStart = useRef<Point | null>(null);
  const minSwipeDistance = 30;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipeDistance) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > minSwipeDistance) {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStart.current = null;
  };

  const spawnFruit = useCallback(() => {
    let newFruit: Point;
    let attempts = 0;
    while (attempts < 100) {
      newFruit = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some((s) => s.x === newFruit.x && s.y === newFruit.y);
      const onWall = walls.some((w) => w.x === newFruit.x && w.y === newFruit.y);
      if (!onSnake && !onWall) {
        setFruit(newFruit);
        return;
      }
      attempts++;
    }
  }, [snake, walls]);

  useEffect(() => {
    if (!fruit && walls.length > 0) spawnFruit();
  }, [walls, fruit, spawnFruit]);

  const startGame = () => {
    setGameState('COUNTDOWN');
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(timer);
        setGameState('PLAYING');
      }
    }, 1000);
  };

  const moveSnake = useCallback(() => {
    if (!isAlive) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + DIRECTIONS[direction].x,
        y: head.y + DIRECTIONS[direction].y,
      };

      if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
      if (newHead.x >= GRID_SIZE) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
      if (newHead.y >= GRID_SIZE) newHead.y = 0;

      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsAlive(false);
        return prevSnake;
      }

      return [newHead, ...prevSnake.slice(0, -1)];
    });
  }, [direction, isAlive]);

  const changeDirection = useCallback((newDirection: Direction) => {
    setDirection((prev) => {
      const isOpposite =
        (newDirection === 'UP' && prev === 'DOWN') ||
        (newDirection === 'DOWN' && prev === 'UP') ||
        (newDirection === 'LEFT' && prev === 'RIGHT') ||
        (newDirection === 'RIGHT' && prev === 'LEFT');

      if (isOpposite) return prev;
      return newDirection;
    });
  }, []);

  const grow = useCallback(() => {
    setSnake((prev) => [...prev, prev[prev.length - 1]]);
  }, []);

  const resetSnake = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection('UP');
    setIsAlive(true);
  }, []);

  useGameLoop(
    () => {
      if (gameState !== 'PLAYING') return;
      moveSnake();
    },
    gameState === 'PLAYING' ? speed : null
  );

  useEffect(() => {
    if (!isAlive && gameState === 'PLAYING') {
      setLives((l) => l + 1);
      setGameState('GAMEOVER');

      setTimeout(() => {
        resetSnake();
        setGameState('COUNTDOWN');
        setCountdown(3);
        let count = 3;
        const timer = setInterval(() => {
          count--;
          setCountdown(count);
          if (count === 0) {
            clearInterval(timer);
            setGameState('PLAYING');
          }
        }, 1000);
      }, 1000);
    }

    if (gameState !== 'PLAYING') return;

    const head = snake[0];

    if (fruit && head.x === fruit.x && head.y === fruit.y) {
      grow();
      setScore((s) => s + 1);
      setSpeed((s) => Math.max(MIN_SPEED, s - SPEED_DECREMENT));
      spawnFruit();
    }

    if (walls.some((w) => w.x === head.x && w.y === head.y)) {
      setLives((l) => l + 1);
      setGameState('COUNTDOWN');
      resetSnake();
      setCountdown(3);
      let count = 3;
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(timer);
          setGameState('PLAYING');
        }
      }, 1000);
    }
  }, [snake, isAlive, fruit, walls, grow, spawnFruit, resetSnake, gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState]);

  useEffect(() => {
    if (gameState === 'GAMEOVER' && onComplete) {
      onComplete(score * 100);
    }
  }, [gameState, score, onComplete]);

  const handleShare = async () => {
    const text = `Snakle #${new Date().toISOString().split('T')[0]}\n🍎 ${score} Fruits\n💀 ${lives} Lives`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div
      className="flex min-h-screen touch-none flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mb-6 flex gap-8 font-mono text-xl font-bold">
        <div className="text-neon-green flex items-center gap-2">
          <span>🍎</span> {score}
        </div>
        <div className="text-neon-pink flex items-center gap-2">
          <span>💀</span> {lives}
        </div>
      </div>

      <div className="relative">
        <Board snake={snake} fruit={fruit} walls={walls} />

        {gameState === 'START' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg bg-black/80 backdrop-blur-sm">
            <h1 className="from-neon-green to-neon-blue mb-8 bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
              SNAKLE
            </h1>
            <button
              onClick={startGame}
              className="bg-neon-green shadow-neon-green/30 hover:bg-neon-blue flex transform items-center gap-2 rounded-full px-8 py-3 text-xl font-bold text-black shadow-lg transition-all hover:scale-105"
            >
              <Play size={24} /> PLAY
            </button>
            <p className="mt-4 text-sm text-gray-400">Swipe or use Arrow Keys</p>
          </div>
        )}

        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
            <div className="animate-bounce text-8xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {countdown}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleShare}
          className="border-neon-blue/30 flex items-center gap-2 rounded-lg border bg-gray-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-700"
        >
          <Share2 size={16} /> Share Result
        </button>
      </div>
    </div>
  );
}
