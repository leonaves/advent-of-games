import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

export interface GameProps {
  seed?: number;
  onComplete?: (score: number) => void;
}

// Weather types
enum WeatherType {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  WINDY = 'windy',
  RAINY = 'rainy',
  SNOWING = 'snowing',
}

const WEATHER_EMOJI: Record<WeatherType, string> = {
  [WeatherType.SUNNY]: '☀️',
  [WeatherType.CLOUDY]: '☁️',
  [WeatherType.WINDY]: '💨',
  [WeatherType.RAINY]: '🌧️',
  [WeatherType.SNOWING]: '❄️',
};

const WEATHER_CONFIGS = {
  [WeatherType.SUNNY]: {
    canMakeHay: true,
    hayLossRate: 0,
    minDuration: 2,
    maxDuration: 6,
    possibleTransitions: [
      WeatherType.SUNNY,
      WeatherType.SUNNY,
      WeatherType.CLOUDY,
      WeatherType.WINDY,
    ],
  },
  [WeatherType.CLOUDY]: {
    canMakeHay: false,
    hayLossRate: 0,
    minDuration: 2,
    maxDuration: 3,
    possibleTransitions: [
      WeatherType.SUNNY,
      WeatherType.SUNNY,
      WeatherType.SUNNY,
      WeatherType.CLOUDY,
      WeatherType.WINDY,
      WeatherType.RAINY,
    ],
  },
  [WeatherType.WINDY]: {
    canMakeHay: false,
    hayLossRate: 1.5,
    minDuration: 2,
    maxDuration: 3,
    possibleTransitions: [
      WeatherType.SUNNY,
      WeatherType.SUNNY,
      WeatherType.CLOUDY,
      WeatherType.RAINY,
    ],
  },
  [WeatherType.RAINY]: {
    canMakeHay: false,
    hayLossRate: 3,
    minDuration: 2,
    maxDuration: 3,
    possibleTransitions: [
      WeatherType.SUNNY,
      WeatherType.SUNNY,
      WeatherType.CLOUDY,
      WeatherType.WINDY,
      WeatherType.SNOWING,
      WeatherType.SNOWING,
    ],
  },
  [WeatherType.SNOWING]: {
    canMakeHay: false,
    hayLossRate: 50,
    minDuration: 1,
    maxDuration: 2,
    possibleTransitions: [WeatherType.SUNNY, WeatherType.SUNNY, WeatherType.CLOUDY],
  },
};

const GAME_CONSTANTS = {
  GAME_DURATION: 90,
  BASE_COVER_TIME: 2,
  COVER_SCALING_FACTOR: 0.1,
  MAKE_HAY_DURATION: 0.25,
  TICK_RATE: 100,
  MAX_FIELD_HAY: 90,
};

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  startTime: number;
  elapsedTime: number;
  uncoveredHay: number;
  coveredHay: number;
  isMakingHay: boolean;
  makeHayProgress: number;
  makeHayStartTime: number | null;
  isCovering: boolean;
  coverProgress: number;
  coverStartTime: number | null;
  coverDuration: number;
  hayBeingTransferred: number;
  startUncoveredHay: number;
  startCoveredHay: number;
  weather: {
    current: WeatherType;
    nextChangeAt: number;
    duration: number;
  };
}

const getRandomDuration = (weather: WeatherType) => {
  const config = WEATHER_CONFIGS[weather];
  return config.minDuration + Math.random() * (config.maxDuration - config.minDuration);
};

const getNextWeather = (current: WeatherType) => {
  const config = WEATHER_CONFIGS[current];
  const transitions = config.possibleTransitions;
  return transitions[Math.floor(Math.random() * transitions.length)];
};

const calculateCoverDuration = (hay: number) => {
  return GAME_CONSTANTS.BASE_COVER_TIME + hay * GAME_CONSTANTS.COVER_SCALING_FACTOR;
};

const useGameStore = create<
  GameState & {
    startGame: () => void;
    tick: () => void;
    makeHay: () => void;
    startCovering: () => void;
    stopCovering: () => void;
    endGame: () => void;
    canMakeHay: () => boolean;
  }
>((set, get) => ({
  isPlaying: false,
  isGameOver: false,
  startTime: 0,
  elapsedTime: 0,
  uncoveredHay: 0,
  coveredHay: 0,
  isMakingHay: false,
  makeHayProgress: 0,
  makeHayStartTime: null,
  isCovering: false,
  coverProgress: 0,
  coverStartTime: null,
  coverDuration: 0,
  hayBeingTransferred: 0,
  startUncoveredHay: 0,
  startCoveredHay: 0,
  weather: {
    current: WeatherType.SUNNY,
    nextChangeAt: 5,
    duration: 5,
  },

  startGame: () => {
    const now = Date.now();
    const duration = getRandomDuration(WeatherType.SUNNY);
    set({
      isPlaying: true,
      isGameOver: false,
      startTime: now,
      elapsedTime: 0,
      uncoveredHay: 0,
      coveredHay: 0,
      isMakingHay: false,
      makeHayProgress: 0,
      makeHayStartTime: null,
      isCovering: false,
      coverProgress: 0,
      coverStartTime: null,
      weather: {
        current: WeatherType.SUNNY,
        nextChangeAt: duration,
        duration,
      },
    });
  },

  endGame: () => {
    set({ isPlaying: false, isGameOver: true });
  },

  tick: () => {
    const state = get();
    if (!state.isPlaying || state.isGameOver) return;

    const now = Date.now();
    const newElapsedTime = (now - state.startTime) / 1000;

    if (newElapsedTime >= GAME_CONSTANTS.GAME_DURATION) {
      get().endGame();
      return;
    }

    const updates: Partial<GameState> = { elapsedTime: newElapsedTime };

    // Handle hay-making
    if (state.isMakingHay && state.makeHayStartTime !== null) {
      const elapsed = (now - state.makeHayStartTime) / 1000;
      const progress = Math.min((elapsed / GAME_CONSTANTS.MAKE_HAY_DURATION) * 100, 100);

      if (progress >= 100) {
        updates.isMakingHay = false;
        updates.makeHayProgress = 0;
        updates.makeHayStartTime = null;
        updates.uncoveredHay = Math.min(state.uncoveredHay + 1, GAME_CONSTANTS.MAX_FIELD_HAY);
      } else {
        updates.makeHayProgress = progress;
      }
    }

    // Handle covering
    if (state.isCovering && state.coverStartTime !== null) {
      const elapsed = (now - state.coverStartTime) / 1000;
      const progress = Math.min((elapsed / state.coverDuration) * 100, 100);
      const progressRatio = progress / 100;

      const transferred = Math.floor(state.hayBeingTransferred * progressRatio);
      updates.coveredHay = Math.max(0, state.startCoveredHay + transferred);
      updates.uncoveredHay = Math.max(0, state.startUncoveredHay - transferred);

      if (progress >= 100) {
        updates.isCovering = false;
        updates.coverProgress = 0;
        updates.coverStartTime = null;
        updates.hayBeingTransferred = 0;
      } else {
        updates.coverProgress = progress;
      }
    }

    // Handle hay loss
    if (!state.isCovering && state.uncoveredHay > 0) {
      const config = WEATHER_CONFIGS[state.weather.current];
      if (config.hayLossRate > 0) {
        const lossAmount = (config.hayLossRate * GAME_CONSTANTS.TICK_RATE) / 1000;
        updates.uncoveredHay = Math.max(0, state.uncoveredHay - lossAmount);
      }
    }

    // Handle weather changes
    if (newElapsedTime >= state.weather.nextChangeAt) {
      const newWeather = getNextWeather(state.weather.current);
      const newDuration = getRandomDuration(newWeather);
      updates.weather = {
        current: newWeather,
        nextChangeAt: newElapsedTime + newDuration,
        duration: newDuration,
      };
    }

    set(updates);
  },

  makeHay: () => {
    const state = get();
    if (!get().canMakeHay()) return;
    if (state.uncoveredHay >= GAME_CONSTANTS.MAX_FIELD_HAY) return;

    set({
      isMakingHay: true,
      makeHayProgress: 0,
      makeHayStartTime: Date.now(),
    });
  },

  startCovering: () => {
    const state = get();
    if (!state.isPlaying || state.isGameOver || state.isCovering || state.uncoveredHay <= 0) return;

    const duration = calculateCoverDuration(state.uncoveredHay);
    set({
      isCovering: true,
      coverProgress: 0,
      coverStartTime: Date.now(),
      coverDuration: duration,
      hayBeingTransferred: state.uncoveredHay,
      startUncoveredHay: state.uncoveredHay,
      startCoveredHay: state.coveredHay,
    });
  },

  stopCovering: () => {
    const state = get();
    if (!state.isCovering) return;

    const progressRatio = state.coverProgress / 100;
    const transferred = Math.floor(state.hayBeingTransferred * progressRatio);

    set({
      isCovering: false,
      coverProgress: 0,
      coverStartTime: null,
      hayBeingTransferred: 0,
      uncoveredHay: Math.max(0, state.startUncoveredHay - transferred),
    });
  },

  canMakeHay: () => {
    const state = get();
    if (!state.isPlaying || state.isGameOver || state.isCovering || state.isMakingHay) return false;
    if (state.uncoveredHay >= GAME_CONSTANTS.MAX_FIELD_HAY) return false;
    return WEATHER_CONFIGS[state.weather.current].canMakeHay;
  },
}));

export function Game({ seed, onComplete }: GameProps) {
  const [showInstructions, setShowInstructions] = useState(true);
  const store = useGameStore();
  const tickInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (store.isPlaying) {
      tickInterval.current = setInterval(() => {
        store.tick();
      }, GAME_CONSTANTS.TICK_RATE);

      return () => {
        if (tickInterval.current) clearInterval(tickInterval.current);
      };
    }
  }, [store.isPlaying]);

  useEffect(() => {
    if (store.isGameOver && onComplete) {
      onComplete(Math.floor(store.coveredHay));
    }
  }, [store.isGameOver, store.coveredHay, onComplete]);

  const handleStart = () => {
    setShowInstructions(false);
    store.startGame();
  };

  const handlePlayAgain = () => {
    setShowInstructions(true);
    store.startGame();
  };

  const remainingTime = Math.max(0, GAME_CONSTANTS.GAME_DURATION - store.elapsedTime);

  if (showInstructions) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-white">
        <h1 className="from-neon-green to-neon-blue mb-4 bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
          🌾 HAY GIRL 🌾
        </h1>
        <p className="mb-6 text-xl text-blue-100">
          Make hay while the sun shines! Cover your hay before bad weather destroys it. You have 90
          seconds to maximize your score.
        </p>
        <div className="border-neon-blue/50 mb-6 rounded-lg border-2 bg-black/60 p-6">
          <h2 className="text-neon-blue mb-3 text-lg font-bold">How to Play:</h2>
          <ul className="space-y-2 text-sm">
            <li>
              ☀️ <strong>Sunny:</strong> Make hay (+1 per click)
            </li>
            <li>
              ☁️ <strong>Cloudy:</strong> Cannot make hay, no loss
            </li>
            <li>
              💨 <strong>Windy:</strong> Lose 1.5 hay/sec from field
            </li>
            <li>
              🌧️ <strong>Rainy:</strong> Lose 3 hay/sec from field
            </li>
            <li>
              ❄️ <strong>Snowing:</strong> Lose 50 hay/sec from field (brutal!)
            </li>
            <li>
              🏚️ <strong>Cover Hay:</strong> Move field hay to barn (safe forever!)
            </li>
            <li>
              ⛔ <strong>Stop Covering:</strong> Cancel covering to make more hay
            </li>
          </ul>
        </div>
        <button
          onClick={handleStart}
          className="bg-neon-green hover:bg-neon-blue w-full transform rounded-lg border-4 border-white/30 px-8 py-4 text-xl font-bold text-black shadow-[0_0_20px_rgba(0,255,157,0.5)] transition-all hover:scale-105"
        >
          Start Game
        </button>
      </div>
    );
  }

  if (store.isGameOver) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-white">
        <h1 className="from-neon-green to-neon-blue mb-4 bg-gradient-to-r bg-clip-text text-5xl font-bold text-transparent">
          GAME OVER
        </h1>
        <div className="mb-6 text-6xl">🌾</div>
        <p className="mb-8 text-3xl">
          Final Score:{' '}
          <span className="text-neon-green font-bold">{Math.floor(store.coveredHay)}</span> hay
        </p>
        <button
          onClick={handlePlayAgain}
          className="bg-neon-green hover:bg-neon-blue transform rounded-lg border-4 border-white/30 px-8 py-4 text-xl font-bold text-black shadow-[0_0_20px_rgba(0,255,157,0.5)] transition-all hover:scale-105"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 text-white">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-2xl">
          Time: <span className="text-neon-blue font-mono">{Math.floor(remainingTime)}s</span>
        </div>
        <div className="text-4xl">{WEATHER_EMOJI[store.weather.current]}</div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="border-neon-green/50 rounded-lg border-2 bg-black/60 p-4 text-center">
          <div className="text-sm text-gray-400">Field</div>
          <div className="text-neon-green text-3xl font-bold">{Math.floor(store.uncoveredHay)}</div>
        </div>
        <div className="border-neon-blue/50 rounded-lg border-2 bg-black/60 p-4 text-center">
          <div className="text-sm text-gray-400">Barn (Safe)</div>
          <div className="text-neon-blue text-3xl font-bold">{Math.floor(store.coveredHay)}</div>
        </div>
      </div>

      {/* Progress Bar for Covering */}
      {store.isCovering && (
        <div className="border-neon-purple/50 mb-4 rounded-lg border-2 bg-black/60 p-4">
          <div className="mb-2 text-center text-sm">
            Covering Hay... {store.coverProgress.toFixed(0)}%
          </div>
          <div className="h-4 w-full rounded-full bg-gray-800">
            <div
              className="from-neon-purple to-neon-pink h-4 rounded-full bg-gradient-to-r transition-all"
              style={{ width: `${store.coverProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={store.makeHay}
          disabled={!store.canMakeHay()}
          className={`rounded-lg border-4 px-6 py-8 text-lg font-bold transition-all ${
            store.canMakeHay()
              ? 'bg-neon-green/20 border-neon-green text-neon-green hover:bg-neon-green shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:text-black'
              : 'cursor-not-allowed border-gray-600 bg-gray-800 text-gray-500'
          }`}
        >
          {store.isMakingHay ? `Making... ${store.makeHayProgress.toFixed(0)}%` : 'Make Hay 🌾'}
        </button>

        {!store.isCovering ? (
          <button
            onClick={store.startCovering}
            disabled={store.uncoveredHay <= 0 || store.isCovering}
            className={`rounded-lg border-4 px-6 py-8 text-lg font-bold transition-all ${
              store.uncoveredHay > 0
                ? 'bg-neon-blue/20 border-neon-blue text-neon-blue hover:bg-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:text-black'
                : 'cursor-not-allowed border-gray-600 bg-gray-800 text-gray-500'
            }`}
          >
            Cover Hay 🏚️
          </button>
        ) : (
          <button
            onClick={store.stopCovering}
            className="bg-neon-pink/20 border-neon-pink text-neon-pink hover:bg-neon-pink rounded-lg border-4 px-6 py-8 text-lg font-bold shadow-[0_0_20px_rgba(255,0,60,0.3)] transition-all hover:text-black"
          >
            Stop Covering ⛔
          </button>
        )}
      </div>
    </div>
  );
}
