import { useState, useEffect, useRef, useCallback } from 'react';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

// Constants
const GRID_SIZE = {
  rows: 15,
  cols: 15,
};

enum LaneType {
  SAFE = 'safe',
  ROAD = 'road',
  RIVER = 'river',
  GOAL = 'goal',
}

enum ObjectType {
  CAR = 'car',
  TRUCK = 'truck',
  TURTLE = 'turtle',
  LOG = 'log',
  LILYPAD = 'lilypad',
}

const SPEEDS = {
  SLOW: 2,
  MEDIUM: 4,
  FAST: 6,
};

const OBJECT_SIZES: Record<ObjectType, number> = {
  [ObjectType.CAR]: 1,
  [ObjectType.TRUCK]: 2,
  [ObjectType.TURTLE]: 1,
  [ObjectType.LOG]: 2,
  [ObjectType.LILYPAD]: 1,
};

interface Position {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  type: ObjectType;
  width: number;
  sinking?: boolean;
  sinkCycle?: number;
}

interface Lane {
  type: LaneType;
  obstacles: Obstacle[];
  speed: number;
  direction: number;
  id: number;
}

type GameState = 'playing' | 'won' | 'lost';

// RNG for seeded randomness
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextFloat(): number {
    return this.next();
  }

  nextRange(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// Utility functions
const isColliding = (frog: Position, obstacles: Obstacle[], laneType: LaneType): boolean => {
  const HITBOX_PADDING = 0.15;
  const frogLeft = frog.x + HITBOX_PADDING;
  const frogRight = frog.x + 1 - HITBOX_PADDING;

  for (const obs of obstacles) {
    const obsWidth = obs.width || 1;
    const obsLeft = obs.x + HITBOX_PADDING;
    const obsRight = obs.x + obsWidth - HITBOX_PADDING;

    const overlap = frogLeft < obsRight && frogRight > obsLeft;

    if (overlap) {
      if (laneType === LaneType.ROAD) {
        return true; // Hit by car
      } else if (laneType === LaneType.RIVER) {
        return false; // Safe on log/turtle
      }
    }
  }

  // If river and no collision with object, frog is in water (dead)
  if (laneType === LaneType.RIVER) {
    return true;
  }

  return false;
};

const moveFrog = (currentPos: Position, direction: string): Position => {
  const newPos = { ...currentPos };

  switch (direction) {
    case 'up':
      newPos.y = Math.max(0, newPos.y - 1);
      break;
    case 'down':
      newPos.y = Math.min(GRID_SIZE.rows - 1, newPos.y + 1);
      break;
    case 'left':
      newPos.x = Math.max(0, newPos.x - 1);
      break;
    case 'right':
      newPos.x = Math.min(GRID_SIZE.cols - 1, newPos.x + 1);
      break;
  }

  return newPos;
};

const findPlatformUnder = (frog: Position, obstacles: Obstacle[]): Obstacle | null => {
  const HITBOX_PADDING = 0.15;
  const frogLeft = frog.x + HITBOX_PADDING;
  const frogRight = frog.x + 1 - HITBOX_PADDING;

  for (const obs of obstacles) {
    const obsWidth = obs.width || 1;
    const obsLeft = obs.x + HITBOX_PADDING;
    const obsRight = obs.x + obsWidth - HITBOX_PADDING;

    const overlap = frogLeft < obsRight && frogRight > obsLeft;

    if (overlap) {
      return obs;
    }
  }

  return null;
};

const centerFrogOnPlatform = (frog: Position, platform: Obstacle | null): number => {
  if (!platform) return frog.x;

  const obsWidth = platform.width || 1;
  const platformCenter = platform.x + obsWidth / 2;

  return platformCenter - 0.5;
};

export function Game({ seed, onComplete }: GameProps) {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(0);
  const [frogPos, setFrogPos] = useState<Position>({
    x: Math.floor(GRID_SIZE.cols / 2),
    y: GRID_SIZE.rows - 1,
  });
  const [lanes, setLanes] = useState<Lane[]>([]);

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const lanesRef = useRef<Lane[]>([]);
  const frogPosRef = useRef<Position>(frogPos);

  // Initialize Game
  useEffect(() => {
    const rng = new SeededRNG(seed || Date.now());
    const newLanes: Lane[] = [];
    let prevSpeed: number | null = null;
    let prevDirection: number | null = null;

    for (let i = 0; i < GRID_SIZE.rows; i++) {
      let type = LaneType.SAFE;
      let obstacles: Obstacle[] = [];
      let speed = 0;
      let direction = 1;

      if (i === 0) {
        type = LaneType.GOAL;
      } else if (i > 0 && i < 6) {
        type = LaneType.RIVER;

        const availableSpeeds = [SPEEDS.SLOW, SPEEDS.MEDIUM];
        const availableDirections = [-1, 1];

        if (prevSpeed !== null && rng.nextFloat() > 0.2) {
          if (rng.nextFloat() > 0.5) {
            direction = prevDirection === 1 ? -1 : 1;
            speed = rng.choice(availableSpeeds);
          } else {
            const filteredSpeeds = availableSpeeds.filter((s) => s !== prevSpeed);
            speed =
              filteredSpeeds.length > 0 ? rng.choice(filteredSpeeds) : rng.choice(availableSpeeds);
            direction = rng.choice(availableDirections);
          }
        } else {
          speed = rng.choice(availableSpeeds);
          direction = rng.choice(availableDirections);
        }

        const obsType = rng.choice([ObjectType.LOG, ObjectType.TURTLE, ObjectType.LILYPAD]);
        const count = rng.nextRange(2, 4);

        for (let j = 0; j < count; j++) {
          let width = OBJECT_SIZES[obsType];

          if (obsType === ObjectType.LOG) {
            const lengthChoice = rng.nextFloat();
            if (lengthChoice < 0.2) {
              width = 1;
            } else if (lengthChoice < 0.85) {
              width = 2;
            } else {
              width = 3;
            }
          }

          obstacles.push({
            x: j * (GRID_SIZE.cols / count) + rng.nextRange(0, 2),
            type: obsType,
            width: width,
            sinking: obsType === ObjectType.TURTLE ? false : undefined,
            sinkCycle: obsType === ObjectType.TURTLE ? rng.nextRange(0, 100) : undefined,
          });
        }

        prevSpeed = speed;
        prevDirection = direction;
      } else if (i > 6 && i < 14) {
        type = LaneType.ROAD;

        const availableSpeeds = [SPEEDS.SLOW, SPEEDS.MEDIUM, SPEEDS.FAST];
        const availableDirections = [-1, 1];

        if (prevSpeed !== null && rng.nextFloat() > 0.2) {
          if (rng.nextFloat() > 0.5) {
            direction = prevDirection === 1 ? -1 : 1;
            speed = rng.choice(availableSpeeds);
          } else {
            const filteredSpeeds = availableSpeeds.filter((s) => s !== prevSpeed);
            speed =
              filteredSpeeds.length > 0 ? rng.choice(filteredSpeeds) : rng.choice(availableSpeeds);
            direction = rng.choice(availableDirections);
          }
        } else {
          speed = rng.choice(availableSpeeds);
          direction = rng.choice(availableDirections);
        }

        const obsType = rng.choice([ObjectType.CAR, ObjectType.TRUCK]);
        const count = rng.nextRange(2, 4);
        for (let j = 0; j < count; j++) {
          obstacles.push({
            x: j * (GRID_SIZE.cols / count) + rng.nextRange(0, 2),
            type: obsType,
            width: OBJECT_SIZES[obsType],
          });
        }

        prevSpeed = speed;
        prevDirection = direction;
      } else {
        prevSpeed = null;
        prevDirection = null;
      }

      newLanes.push({ type, obstacles, speed, direction, id: i });
    }

    setLanes(newLanes);
    lanesRef.current = newLanes;
  }, [seed]);

  const handleMove = useCallback(
    (direction: string) => {
      if (gameState !== 'playing') return;

      setFrogPos((prev) => {
        const newPos = moveFrog(prev, direction);

        if (direction === 'up' || direction === 'down') {
          newPos.x = Math.round(newPos.x);

          const targetLane = lanesRef.current[newPos.y];
          if (targetLane && targetLane.type === LaneType.RIVER) {
            const platform = findPlatformUnder(newPos, targetLane.obstacles);
            if (platform) {
              newPos.x = centerFrogOnPlatform(newPos, platform);
            }
          }
        }

        frogPosRef.current = newPos;
        return newPos;
      });
    },
    [gameState]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleMove('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleMove('right');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  useEffect(() => {
    frogPosRef.current = frogPos;
  }, [frogPos]);

  // Game Loop
  const animate = useCallback(
    (time: number) => {
      if (gameState !== 'playing') return;

      if (previousTimeRef.current !== undefined) {
        const deltaTime = (time - previousTimeRef.current) / 1000;

        setTime((prev) => prev + deltaTime);

        const currentLanes = lanesRef.current.map((lane) => {
          if (lane.speed === 0) return lane;

          const moveAmount = lane.speed * deltaTime * lane.direction;
          const newObstacles = lane.obstacles.map((obs) => {
            let newX = obs.x + moveAmount;
            if (lane.direction === 1 && newX > GRID_SIZE.cols) newX = -obs.width;
            if (lane.direction === -1 && newX < -obs.width) newX = GRID_SIZE.cols;

            let newObs = { ...obs, x: newX };
            if (obs.type === ObjectType.TURTLE) {
              const cycle = (time / 1000 + (obs.sinkCycle || 0)) % 5;
              newObs.sinking = cycle > 3;
            }

            return newObs;
          });
          return { ...lane, obstacles: newObstacles };
        });

        lanesRef.current = currentLanes;
        setLanes(currentLanes);

        const currentFrogY = frogPosRef.current.y;
        const currentLane = currentLanes[currentFrogY];

        if (currentLane && currentLane.type === LaneType.RIVER) {
          const dead = isColliding(frogPosRef.current, currentLane.obstacles, currentLane.type);

          if (!dead) {
            const drift = currentLane.speed * deltaTime * currentLane.direction;
            const newX = frogPosRef.current.x + drift;

            frogPosRef.current = { ...frogPosRef.current, x: newX };
            setFrogPos((prev) => ({ ...prev, x: newX }));
          }
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [gameState]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate, gameState]);

  // Collision Check
  useEffect(() => {
    if (gameState !== 'playing') return;

    const currentLane = lanesRef.current[frogPos.y];
    if (!currentLane) return;

    if (currentLane.type === LaneType.GOAL) {
      setGameState('won');
      if (onComplete) onComplete(lives * 100 + Math.floor(100 - time));
      return;
    }

    const hit = isColliding(frogPos, currentLane.obstacles, currentLane.type);

    if (hit) {
      if (lives > 1) {
        setLives((l) => l - 1);
        setFrogPos({ x: Math.floor(GRID_SIZE.cols / 2), y: GRID_SIZE.rows - 1 });
      } else {
        setLives(0);
        setGameState('lost');
        if (onComplete) onComplete(0);
      }
    } else {
      if (currentLane.type === LaneType.RIVER) {
        const platform = findPlatformUnder(frogPos, currentLane.obstacles);
        if (platform && platform.type === ObjectType.TURTLE && platform.sinking) {
          if (lives > 1) {
            setLives((l) => l - 1);
            setFrogPos({ x: Math.floor(GRID_SIZE.cols / 2), y: GRID_SIZE.rows - 1 });
          } else {
            setLives(0);
            setGameState('lost');
            if (onComplete) onComplete(0);
          }
        }
      }
    }
  }, [frogPos, lanes, lives, gameState, time, onComplete]);

  const getLaneBgColor = (type: LaneType) => {
    switch (type) {
      case LaneType.ROAD:
        return 'bg-gray-800';
      case LaneType.RIVER:
        return 'bg-blue-500';
      case LaneType.GOAL:
        return 'bg-neon-green/30';
      default:
        return 'bg-gray-900';
    }
  };

  const getObstacleColor = (type: ObjectType) => {
    switch (type) {
      case ObjectType.LOG:
        return 'bg-amber-800';
      case ObjectType.TURTLE:
        return 'bg-neon-green';
      case ObjectType.CAR:
        return 'bg-neon-pink';
      case ObjectType.TRUCK:
        return 'bg-neon-purple';
      case ObjectType.LILYPAD:
        return 'bg-green-400';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center p-4 text-white">
      <h1 className="from-neon-green to-neon-blue mb-4 bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
        FROGGLE
      </h1>

      {/* Score */}
      <div className="mb-4 flex gap-8 text-xl">
        <div>
          Lives: <span className="text-neon-pink font-bold">{'❤️'.repeat(lives)}</span>
        </div>
        <div>
          Time: <span className="text-neon-blue font-mono">{time.toFixed(1)}s</span>
        </div>
      </div>

      {/* Game Board */}
      <div
        className="border-neon-blue/50 relative overflow-hidden border-4 bg-black shadow-[0_0_30px_rgba(0,243,255,0.3)]"
        style={{
          width: 'min(90vw, 600px)',
          height: 'min(90vw, 600px)',
        }}
      >
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={`relative h-[6.66%] w-full overflow-hidden border-b border-black/10 ${getLaneBgColor(lane.type)}`}
          >
            {lane.obstacles.map((obs, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{
                  left: `${obs.x * 6.66}%`,
                  width: `${(obs.width || 1) * 6.66}%`,
                  opacity: obs.sinking ? 0.3 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <div className="h-full w-full p-1">
                  <div className={`h-full w-full ${getObstacleColor(obs.type)}`}></div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Frog */}
        <div
          className="absolute z-20"
          style={{
            left: 0,
            top: 0,
            width: '6.66%',
            height: '6.66%',
            transform: `translate(${frogPos.x * 100}%, ${frogPos.y * 100}%)`,
          }}
        >
          <svg viewBox="0 0 10 10" className="h-full w-full">
            <rect x="2" y="2" width="6" height="6" fill="#4ade80" />
            <rect x="3" y="3" width="1" height="1" fill="black" />
            <rect x="6" y="3" width="1" height="1" fill="black" />
          </svg>
        </div>

        {/* Game Over */}
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="border-neon-blue relative max-w-lg rounded-2xl border-4 bg-black/80 p-8 text-center">
              <div className="from-neon-blue via-neon-purple to-neon-pink absolute -inset-[4px] -z-10 bg-gradient-to-r opacity-50 blur-lg" />

              <div className="mb-6 text-8xl">{gameState === 'won' ? '🎉' : '💀'}</div>
              <h2 className="mb-4 text-4xl font-bold text-white">
                {gameState === 'won' ? 'YOU WIN!' : 'GAME OVER'}
              </h2>

              <p className="text-neon-green mb-6 text-2xl">
                {gameState === 'won' ? `Time: ${time.toFixed(2)}s` : `Lives Lost: 3`}
              </p>

              <button
                onClick={() => window.location.reload()}
                className="bg-neon-blue hover:bg-neon-green transform rounded-lg border-4 border-white/30 px-8 py-4 text-xl font-bold text-black shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all hover:scale-105"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch Controls */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div></div>
        <button
          onClick={() => handleMove('up')}
          className="bg-neon-blue/20 border-neon-blue hover:bg-neon-blue rounded-lg border-2 p-4 text-2xl hover:text-black"
        >
          ↑
        </button>
        <div></div>
        <button
          onClick={() => handleMove('left')}
          className="bg-neon-blue/20 border-neon-blue hover:bg-neon-blue rounded-lg border-2 p-4 text-2xl hover:text-black"
        >
          ←
        </button>
        <button
          onClick={() => handleMove('down')}
          className="bg-neon-blue/20 border-neon-blue hover:bg-neon-blue rounded-lg border-2 p-4 text-2xl hover:text-black"
        >
          ↓
        </button>
        <button
          onClick={() => handleMove('right')}
          className="bg-neon-blue/20 border-neon-blue hover:bg-neon-blue rounded-lg border-2 p-4 text-2xl hover:text-black"
        >
          →
        </button>
      </div>

      <p className="mt-4 text-center text-gray-400">
        Use arrow keys or buttons to move • Avoid cars • Jump on logs & turtles
      </p>
    </div>
  );
}
