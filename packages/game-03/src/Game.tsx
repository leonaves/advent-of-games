import { useEffect, useMemo, useState } from 'react';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

const EMOJI_POOL = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '🤣',
  '😂',
  '🙂',
  '🙃',
  '😉',
  '😊',
  '😇',
  '🥰',
  '😍',
  '🤩',
  '😘',
  '😗',
  '😚',
  '😙',
  '😋',
  '😛',
  '😜',
  '🤪',
  '😝',
  '🤑',
  '🤗',
  '🤭',
  '🤫',
  '🤔',
  '🤐',
  '🤨',
  '😐',
  '😑',
  '😶',
  '😏',
  '😒',
  '🙄',
  '😬',
  '🤥',
  '😌',
  '😔',
  '😪',
  '🤤',
  '😴',
  '😷',
  '🤒',
  '🤕',
  '🤢',
  '🤮',
  '🤧',
  '🥵',
  '🥶',
  '🥴',
  '😵',
  '🤯',
  '🤠',
  '🥳',
  '😎',
  '🤓',
  '🧐',
  '😕',
  '😟',
  '🙁',
  '☹️',
  '😮',
  '😯',
  '😲',
  '😳',
  '🥺',
  '😦',
  '😧',
  '😨',
  '😰',
  '😥',
  '😢',
  '😭',
  '😱',
  '😖',
  '😣',
  '😞',
  '😓',
  '😩',
  '😫',
  '🥱',
  '😤',
  '😡',
  '😠',
  '🤬',
  '😈',
  '👿',
  '💀',
  '☠️',
  '💩',
  '🤡',
  '👹',
  '👺',
  '👻',
  '👽',
  '👾',
  '🤖',
  '🎃',
  '😺',
  '😸',
  '😹',
  '😻',
  '😼',
  '😽',
  '🙀',
  '😿',
  '😾',
  '🐶',
  '🐱',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐸',
  '🐵',
  '🐔',
  '🐧',
  '🐦',
  '🐤',
];

interface AnimatedEmojiProps {
  emoji: string;
  index: number;
}

function AnimatedEmoji({ emoji, index }: AnimatedEmojiProps) {
  const animations = useMemo(() => {
    let seed = index * 9301 + 49297;
    const random = (min: number, max: number) => {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      return min + rnd * (max - min);
    };

    const startX = random(5, 95);
    const startY = random(15, 70);
    const duration = random(20, 40);
    const rotateAmount = random(-360, 360);

    return { startX, startY, duration, rotateAmount };
  }, [index]);

  const [pos, setPos] = useState({ x: animations.startX, y: animations.startY, rotate: 0 });

  useEffect(() => {
    const animateEmoji = () => {
      const now = Date.now();
      const progress = (now % (animations.duration * 1000)) / (animations.duration * 1000);

      const angle = progress * Math.PI * 2;
      const radiusX = 10 + (index % 3) * 5;
      const radiusY = 8 + (index % 4) * 4;

      const x = animations.startX + Math.cos(angle) * radiusX;
      const y = animations.startY + Math.sin(angle) * radiusY;
      const rotate = progress * animations.rotateAmount;

      setPos({ x, y, rotate });
    };

    const interval = setInterval(animateEmoji, 50);
    return () => clearInterval(interval);
  }, [animations, index]);

  return (
    <div
      className="pointer-events-none absolute select-none text-4xl transition-all duration-300 ease-linear"
      style={{
        left: `${pos.x}vw`,
        top: `${pos.y}vh`,
        transform: `rotate(${pos.rotate}deg)`,
        opacity: 0.7,
        textShadow: '0 0 10px rgba(0, 243, 255, 0.5)',
      }}
    >
      {emoji}
    </div>
  );
}

function generateGameEmojis(seed?: number): {
  allThreeEmojis: string[];
  missingEmoji: string;
  displayEmojis: string[];
} {
  const seededRandom =
    seed !== undefined
      ? (() => {
          let s = seed;
          return () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
          };
        })()
      : Math.random;

  const shuffled = [...EMOJI_POOL].sort(() => seededRandom() - 0.5);
  const allThreeEmojis = shuffled.slice(0, 3);

  const missingIndex = Math.floor(seededRandom() * 3);
  const missingEmoji = allThreeEmojis[missingIndex];

  const presentEmojis = allThreeEmojis.filter((_, i) => i !== missingIndex);
  const otherEmojis = shuffled.slice(3);

  const displayEmojis: string[] = [];
  displayEmojis.push(presentEmojis[0], presentEmojis[1]);

  while (displayEmojis.length < 50) {
    const randomEmoji = otherEmojis[Math.floor(seededRandom() * otherEmojis.length)];
    displayEmojis.push(randomEmoji);
  }

  displayEmojis.sort(() => seededRandom() - 0.5);

  return { allThreeEmojis, missingEmoji, displayEmojis };
}

export function Game({ seed, onComplete }: GameProps) {
  const [startTime] = useState(Date.now());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const gameData = useMemo(() => generateGameEmojis(seed), [seed]);

  useEffect(() => {
    if (!showResults) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showResults]);

  const handleGuess = (emoji: string) => {
    if (showResults) return;

    const newGuesses = [...guesses, emoji];
    setGuesses(newGuesses);

    const elapsed = Date.now() - startTime;
    const correct = emoji === gameData.missingEmoji;

    setIsSuccess(correct);

    if (correct || newGuesses.length >= 2) {
      const finalTime = correct ? elapsed : null;
      setTimeMs(finalTime);
      setShowResults(true);

      if (onComplete) {
        onComplete(correct ? Math.floor(elapsed / 1000) : 0);
      }
    }
  };

  const elapsed = currentTime - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const ms = elapsed % 1000;

  return (
    <div className="relative mx-auto w-full max-w-6xl" style={{ minHeight: '600px' }}>
      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <h1 className="from-neon-pink to-neon-blue mb-2 bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
          Nomoji
        </h1>
        <p className="text-xl text-white/60">Who's missing?</p>
      </div>

      {/* Timer */}
      <div className="relative z-10 mb-6 text-center">
        <div className="text-neon-blue font-mono text-4xl">
          {seconds}.{String(ms).padStart(3, '0').slice(0, 2)}s
        </div>
      </div>

      {/* Animated Emojis Arena */}
      <div className="relative mb-8" style={{ height: '400px' }}>
        {!showResults &&
          gameData.displayEmojis.map((emoji, index) => (
            <AnimatedEmoji key={index} emoji={emoji} index={index} />
          ))}
      </div>

      {/* Guess Buttons */}
      {!showResults && (
        <div className="relative z-10 mb-4 flex items-center justify-center gap-4">
          {gameData.allThreeEmojis.map((emoji) => {
            const isGuessed = guesses.includes(emoji);

            return (
              <button
                key={emoji}
                onClick={() => handleGuess(emoji)}
                disabled={isGuessed}
                className={`
                  transform rounded-xl border-4 p-6 text-5xl transition-all
                  ${
                    isGuessed
                      ? 'border-neon-pink bg-neon-pink/20 cursor-not-allowed opacity-50'
                      : 'border-neon-blue hover:border-neon-green hover:bg-neon-blue/20 bg-black/60 hover:scale-110'
                  }
                  shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,157,0.5)]
                `}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-10 mb-4 text-center text-sm text-white/60">
        Guesses remaining: {2 - guesses.length}
      </div>

      {/* Results */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="border-neon-blue relative max-w-lg rounded-2xl border-4 bg-black/80 p-8 text-center">
            <div className="from-neon-blue via-neon-purple to-neon-pink absolute -inset-[4px] -z-10 bg-gradient-to-r opacity-50 blur-lg" />

            <div className="mb-6 text-8xl">{isSuccess ? '🎉' : '😢'}</div>
            <h2 className="mb-4 text-4xl font-bold text-white">
              {isSuccess ? 'SUCCESS!' : 'GAME OVER'}
            </h2>

            {isSuccess && timeMs !== null && (
              <p className="text-neon-green mb-6 text-2xl">Time: {(timeMs / 1000).toFixed(2)}s</p>
            )}

            <div className="mb-6">
              <p className="mb-2 text-white/60">The missing emoji was:</p>
              <div className="text-7xl">{gameData.missingEmoji}</div>
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
    </div>
  );
}
