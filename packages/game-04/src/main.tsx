import React from 'react';
import ReactDOM from 'react-dom/client';
import { Game } from './Game';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="from-midnight to-midnight flex min-h-screen items-center justify-center bg-gradient-to-br via-gray-900 p-4">
      <Game
        seed={12345}
        onComplete={(score) => {
          console.log('Game completed with score:', score);
        }}
      />
    </div>
  </React.StrictMode>
);
