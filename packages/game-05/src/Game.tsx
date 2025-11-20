import { useState } from 'react';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

// Color definitions
interface Color {
  name: string;
  value: string;
  id: string;
}

const COLORS: Color[] = [
  { name: 'Red', value: '#ef4444', id: 'red' },
  { name: 'Green', value: '#22c55e', id: 'green' },
  { name: 'Blue', value: '#3b82f6', id: 'blue' },
  { name: 'Yellow', value: '#eab308', id: 'yellow' },
  { name: 'Purple', value: '#a855f7', id: 'purple' },
  { name: 'Orange', value: '#f97316', id: 'orange' },
];

type GameStatus = 'playing' | 'won' | 'lost';

interface Feedback {
  exactMatches: number;
  colorMatches: number;
}

// Seeded random number generator
const mulberry32 = (a: number) => {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateCode = (seed: number): Color[] => {
  const random = mulberry32(seed);
  const code: Color[] = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(random() * COLORS.length);
    code.push(COLORS[randomIndex]);
  }
  return code;
};

const checkGuess = (code: Color[], guess: Color[]): Feedback => {
  let exactMatches = 0;
  let colorMatches = 0;

  const codeIds = code.map((c) => c.id);
  const guessIds = guess.map((c) => c.id);

  const codeFreq: Record<string, number> = {};
  const guessFreq: Record<string, number> = {};

  // First pass: count exact matches
  for (let i = 0; i < 4; i++) {
    if (codeIds[i] === guessIds[i]) {
      exactMatches++;
    } else {
      codeFreq[codeIds[i]] = (codeFreq[codeIds[i]] || 0) + 1;
      guessFreq[guessIds[i]] = (guessFreq[guessIds[i]] || 0) + 1;
    }
  }

  // Second pass: count color matches
  for (const color in guessFreq) {
    if (codeFreq[color]) {
      colorMatches += Math.min(guessFreq[color], codeFreq[color]);
    }
  }

  return { exactMatches, colorMatches };
};

// Peg component
function Peg({
  color,
  size = 'md',
  empty = false,
}: {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  empty?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const baseClasses = `rounded-full border-2 transition-all duration-300 ${sizeClasses[size]}`;

  if (empty) {
    return <div className={`${baseClasses} border-dashed border-white/20 bg-white/5`} />;
  }

  return (
    <div
      className={`${baseClasses} border-white/20`}
      style={{
        backgroundColor: color,
        boxShadow:
          'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.3)',
      }}
    />
  );
}

// Row component
function Row({
  guess,
  solution,
  isCurrent,
  currentGuess,
}: {
  guess?: Color[];
  solution?: Color[];
  isCurrent?: boolean;
  currentGuess?: Color[];
}) {
  let pegsToRender: (Color | null)[] = [];
  let feedback: Feedback = { exactMatches: 0, colorMatches: 0 };

  if (isCurrent && currentGuess) {
    pegsToRender = [...currentGuess];
    while (pegsToRender.length < 4) {
      pegsToRender.push(null);
    }
  } else if (guess && solution) {
    pegsToRender = guess;
    feedback = checkGuess(solution, guess);
  } else {
    pegsToRender = [null, null, null, null];
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-xl p-3 transition-all ${
        isCurrent ? 'bg-neon-blue/10 ring-neon-blue/30 ring-2' : 'bg-white/5'
      }`}
    >
      <div className="flex gap-2">
        {pegsToRender.map((color, idx) => (
          <Peg key={idx} color={color?.value} empty={!color} />
        ))}
      </div>

      {/* Feedback Area */}
      <div className="grid h-8 w-8 grid-cols-2 gap-1">
        {!isCurrent && guess && (
          <>
            {[...Array(feedback.exactMatches)].map((_, i) => (
              <div
                key={`exact-${i}`}
                className="bg-neon-pink h-3 w-3 rounded-full shadow-[0_0_8px_rgba(255,0,60,0.5)]"
                title="Correct Position"
              />
            ))}
            {[...Array(feedback.colorMatches)].map((_, i) => (
              <div
                key={`color-${i}`}
                className="h-3 w-3 rounded-full bg-white shadow-sm"
                title="Correct Color"
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function Game({ seed, onComplete }: GameProps) {
  const [guesses, setGuesses] = useState<Color[][]>([]);
  const [currentGuess, setCurrentGuess] = useState<Color[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [solution] = useState<Color[]>(() => generateCode(seed || Date.now()));
  const [showWinModal, setShowWinModal] = useState(false);

  const addPeg = (color: Color) => {
    if (gameStatus !== 'playing' || currentGuess.length >= 4) return;
    setCurrentGuess([...currentGuess, color]);
  };

  const removePeg = () => {
    if (gameStatus !== 'playing' || currentGuess.length === 0) return;
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  const submitGuess = () => {
    if (currentGuess.length !== 4 || gameStatus !== 'playing') return;

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    const { exactMatches } = checkGuess(solution, currentGuess);

    if (exactMatches === 4) {
      setGameStatus('won');
      setShowWinModal(true);
      if (onComplete) {
        // Score based on number of guesses: fewer is better
        const score = Math.max(0, 1000 - newGuesses.length * 100);
        onComplete(score);
      }
    } else if (newGuesses.length >= 10) {
      setGameStatus('lost');
      setShowWinModal(true);
      if (onComplete) {
        onComplete(0);
      }
    }

    setCurrentGuess([]);
  };

  const isFull = currentGuess.length === 4;
  const canSubmit = isFull && gameStatus === 'playing';

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      {/* Board */}
      <div className="shadow-neon-purple/20 mb-6 rounded-3xl border-2 border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-md">
        <div className="scrollbar-thin scrollbar-thumb-neon-blue/30 scrollbar-track-transparent max-h-[500px] space-y-2 overflow-y-auto">
          {/* Render past guesses */}
          {guesses.map((guess, idx) => (
            <Row key={idx} guess={guess} solution={solution} />
          ))}

          {/* Render current guess row if playing */}
          {gameStatus === 'playing' && <Row isCurrent={true} currentGuess={currentGuess} />}

          {/* Render empty rows */}
          {[...Array(Math.max(0, 10 - guesses.length - (gameStatus === 'playing' ? 1 : 0)))].map(
            (_, idx) => (
              <Row key={`empty-${idx}`} />
            )
          )}
        </div>
      </div>

      {/* Color Selector */}
      {gameStatus === 'playing' && (
        <div className="shadow-neon-blue/20 rounded-3xl border-2 border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-4 flex justify-center gap-3">
            {COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => addPeg(color)}
                disabled={isFull}
                className="transition-transform hover:scale-110 active:scale-90 disabled:opacity-30 disabled:hover:scale-100"
              >
                <Peg color={color.value} size="lg" />
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={removePeg}
              disabled={currentGuess.length === 0}
              className="flex-1 rounded-xl border-2 border-white/10 bg-white/10 px-6 py-3 font-bold uppercase tracking-wider text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Delete
            </button>
            <button
              onClick={submitGuess}
              disabled={!canSubmit}
              className={`flex-1 rounded-xl border-2 px-6 py-3 font-bold uppercase tracking-wider shadow-lg transition-all ${
                canSubmit
                  ? 'from-neon-green to-neon-blue hover:shadow-neon-green/30 border-neon-green/50 bg-gradient-to-r text-black hover:-translate-y-0.5'
                  : 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Win/Loss Modal */}
      {showWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="border-neon-blue relative max-w-lg rounded-2xl border-4 bg-black/90 p-8 text-center">
            <div className="from-neon-blue via-neon-purple to-neon-pink absolute -inset-[4px] -z-10 bg-gradient-to-r opacity-50 blur-lg" />

            <div className="mb-6 text-8xl">{gameStatus === 'won' ? '🎉' : '💀'}</div>
            <h2 className="mb-4 text-4xl font-bold text-white">
              {gameStatus === 'won' ? 'YOU WIN!' : 'GAME OVER'}
            </h2>

            <p className="text-neon-green mb-4 text-2xl">
              {gameStatus === 'won'
                ? `Solved in ${guesses.length} tries!`
                : 'Better luck next time!'}
            </p>

            {/* Show solution */}
            <div className="mb-6">
              <p className="mb-2 text-sm uppercase tracking-wider text-white/60">Solution:</p>
              <div className="flex justify-center gap-2">
                {solution.map((color, idx) => (
                  <Peg key={idx} color={color.value} size="md" />
                ))}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-neon-blue hover:bg-neon-green transform rounded-lg border-4 border-white/30 px-8 py-4 text-xl font-bold text-black shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all hover:scale-105"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-white/60">
        <p className="mb-1">Guess the 4-color code</p>
        <p>
          <span className="text-neon-pink">●</span> = Right color & position •{' '}
          <span className="text-white">●</span> = Right color, wrong position
        </p>
      </div>
    </div>
  );
}
