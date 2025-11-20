import React from 'react';
import ReactDOM from 'react-dom/client';
import { Game } from './Game';
import './index.css';

function App() {
  const handleComplete = (score: number) => {
    console.log('Game completed with score:', score);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #000000, #1a1a2e)',
        padding: '2rem',
      }}
    >
      <Game onComplete={handleComplete} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
