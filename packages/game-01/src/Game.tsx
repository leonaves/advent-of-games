import { useEffect, useRef } from 'react';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

export function Game({ seed, onComplete }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new SnakeGame(canvas, { seed, onComplete });

    return () => {
      game.destroy();
    };
  }, [seed, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width="800"
      height="600"
      className="rounded-lg border-4 border-white/20 bg-black/50 shadow-2xl backdrop-blur-sm"
    />
  );
}

class SnakeGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  snake: Snake;
  food: Food;
  obstacles: Obstacle[];
  powerups: Powerup[];
  score: number;
  gameOver: boolean;
  gridSize: number;
  lastTime: number;
  moveInterval: number;
  timeSinceLastMove: number;
  animationFrameId: number | null;
  keydownHandler: (e: KeyboardEvent) => void;
  onComplete?: (score: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    options: { seed?: number; onComplete?: (score: number) => void }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridSize = 20;
    this.score = 0;
    this.gameOver = false;
    this.lastTime = 0;
    this.moveInterval = 100;
    this.timeSinceLastMove = 0;
    this.animationFrameId = null;
    this.onComplete = options.onComplete;

    this.snake = new Snake(this.gridSize);
    this.food = new Food(this.canvas, this.gridSize);
    this.obstacles = [];
    this.powerups = [];

    this.generateObstacles(10);

    this.keydownHandler = (e: KeyboardEvent) => this.handleInput(e);
    document.addEventListener('keydown', this.keydownHandler);

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    document.removeEventListener('keydown', this.keydownHandler);
  }

  generateObstacles(count: number) {
    for (let i = 0; i < count; i++) {
      this.obstacles.push(new Obstacle(this.canvas, this.gridSize));
    }
  }

  handleInput(e: KeyboardEvent) {
    if (this.gameOver && e.code === 'Space') {
      e.preventDefault();
      this.reset();
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.snake.setDirection(0, -1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.snake.setDirection(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.snake.setDirection(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.snake.setDirection(1, 0);
        break;
    }
  }

  reset() {
    this.score = 0;
    this.gameOver = false;
    this.snake = new Snake(this.gridSize);
    this.food = new Food(this.canvas, this.gridSize);
    this.obstacles = [];
    this.powerups = [];
    this.generateObstacles(10);
    this.moveInterval = 100;
  }

  gameLoop(currentTime: number) {
    if (this.gameOver) {
      this.drawGameOver();
      this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
      return;
    }

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.timeSinceLastMove += deltaTime;

    if (this.timeSinceLastMove >= this.moveInterval) {
      this.update();
      this.timeSinceLastMove = 0;
    }

    this.draw();
    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  update() {
    this.snake.move();

    // Check wall collision
    if (this.snake.checkWallCollision(this.canvas.width, this.canvas.height)) {
      if (this.snake.hasGhostPowerup) {
        this.snake.wrap(this.canvas.width, this.canvas.height);
      } else {
        this.gameOver = true;
        this.handleGameOver();
      }
    }

    // Check self collision
    if (this.snake.checkSelfCollision()) {
      this.gameOver = true;
      this.handleGameOver();
    }

    // Check obstacle collision
    if (this.obstacles.some((obs) => obs.checkCollision(this.snake.head))) {
      if (!this.snake.hasGhostPowerup) {
        this.gameOver = true;
        this.handleGameOver();
      }
    }

    // Check food collision
    if (this.food.checkCollision(this.snake.head)) {
      this.score += 10;
      this.snake.grow();
      this.food.respawn(this.canvas, this.obstacles);

      // Chance to spawn powerup
      if (Math.random() < 0.2) {
        this.powerups.push(new Powerup(this.canvas, this.gridSize, 'ghost'));
      }
    }

    // Check powerup collision
    this.powerups = this.powerups.filter((p) => {
      if (p.checkCollision(this.snake.head)) {
        this.snake.activatePowerup(p.type);
        return false;
      }
      return true;
    });

    this.snake.updatePowerups();
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.food.draw(this.ctx);
    this.obstacles.forEach((o) => o.draw(this.ctx));
    this.powerups.forEach((p) => p.draw(this.ctx));
    this.snake.draw(this.ctx);

    // Draw Score
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.score}`, 20, 30);

    if (this.snake.hasGhostPowerup) {
      this.ctx.fillStyle = '#00ffff';
      this.ctx.fillText(`GHOST MODE: ${Math.ceil(this.snake.powerupTimer / 60)}s`, 20, 60);
    }
  }

  drawGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);

    this.ctx.font = '20px Arial';
    this.ctx.fillText(
      `Final Score: ${this.score}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 40
    );
    this.ctx.fillText('Press SPACE to restart', this.canvas.width / 2, this.canvas.height / 2 + 80);
  }

  handleGameOver() {
    if (this.onComplete) {
      this.onComplete(this.score);
    }
  }
}

class Snake {
  body: { x: number; y: number }[];
  direction: { x: number; y: number };
  gridSize: number;
  hasGhostPowerup: boolean;
  powerupTimer: number;

  constructor(gridSize: number) {
    this.gridSize = gridSize;
    this.body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ];
    this.direction = { x: 1, y: 0 };
    this.hasGhostPowerup = false;
    this.powerupTimer = 0;
  }

  get head() {
    return this.body[0];
  }

  setDirection(x: number, y: number) {
    // Prevent 180 degree turns
    if (this.direction.x + x === 0 && this.direction.y + y === 0) return;
    this.direction = { x, y };
  }

  move() {
    const newHead = {
      x: this.head.x + this.direction.x,
      y: this.head.y + this.direction.y,
    };
    this.body.unshift(newHead);
    this.body.pop();
  }

  grow() {
    const tail = this.body[this.body.length - 1];
    this.body.push({ ...tail });
  }

  checkWallCollision(width: number, height: number) {
    const maxX = width / this.gridSize;
    const maxY = height / this.gridSize;
    return this.head.x < 0 || this.head.x >= maxX || this.head.y < 0 || this.head.y >= maxY;
  }

  wrap(width: number, height: number) {
    const maxX = width / this.gridSize;
    const maxY = height / this.gridSize;

    if (this.head.x < 0) this.body[0].x = maxX - 1;
    if (this.head.x >= maxX) this.body[0].x = 0;
    if (this.head.y < 0) this.body[0].y = maxY - 1;
    if (this.head.y >= maxY) this.body[0].y = 0;
  }

  checkSelfCollision() {
    return this.body
      .slice(1)
      .some((segment) => segment.x === this.head.x && segment.y === this.head.y);
  }

  activatePowerup(type: string) {
    if (type === 'ghost') {
      this.hasGhostPowerup = true;
      this.powerupTimer = 600; // Frames (approx 10s at 60fps)
    }
  }

  updatePowerups() {
    if (this.hasGhostPowerup) {
      this.powerupTimer--;
      if (this.powerupTimer <= 0) {
        this.hasGhostPowerup = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.hasGhostPowerup ? '#00ffff' : '#4ade80';
    this.body.forEach((segment) => {
      ctx.fillRect(
        segment.x * this.gridSize,
        segment.y * this.gridSize,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
  }
}

class Food {
  x: number;
  y: number;
  gridSize: number;

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.gridSize = gridSize;
    this.x = 0;
    this.y = 0;
    this.respawn(canvas, []);
  }

  respawn(canvas: HTMLCanvasElement, obstacles: Obstacle[]) {
    const maxX = canvas.width / this.gridSize;
    const maxY = canvas.height / this.gridSize;

    let valid = false;
    while (!valid) {
      this.x = Math.floor(Math.random() * maxX);
      this.y = Math.floor(Math.random() * maxY);
      valid = !obstacles.some((o) => o.x === this.x && o.y === this.y);
    }
  }

  checkCollision(pos: { x: number; y: number }) {
    return this.x === pos.x && this.y === pos.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    const cx = this.x * this.gridSize + this.gridSize / 2;
    const cy = this.y * this.gridSize + this.gridSize / 2;
    ctx.arc(cx, cy, this.gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Obstacle {
  x: number;
  y: number;
  gridSize: number;

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.gridSize = gridSize;
    const maxX = canvas.width / this.gridSize;
    const maxY = canvas.height / this.gridSize;
    this.x = Math.floor(Math.random() * maxX);
    this.y = Math.floor(Math.random() * maxY);
  }

  checkCollision(pos: { x: number; y: number }) {
    return this.x === pos.x && this.y === pos.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(
      this.x * this.gridSize,
      this.y * this.gridSize,
      this.gridSize - 2,
      this.gridSize - 2
    );
  }
}

class Powerup {
  x: number;
  y: number;
  gridSize: number;
  type: string;

  constructor(canvas: HTMLCanvasElement, gridSize: number, type: string) {
    this.gridSize = gridSize;
    this.type = type;
    const maxX = canvas.width / this.gridSize;
    const maxY = canvas.height / this.gridSize;
    this.x = Math.floor(Math.random() * maxX);
    this.y = Math.floor(Math.random() * maxY);
  }

  checkCollision(pos: { x: number; y: number }) {
    return this.x === pos.x && this.y === pos.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    const cx = this.x * this.gridSize + this.gridSize / 2;
    const cy = this.y * this.gridSize + this.gridSize / 2;

    ctx.arc(cx, cy, this.gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('G', cx, cy + 4);
  }
}
