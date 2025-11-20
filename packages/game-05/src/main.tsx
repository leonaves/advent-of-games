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
        background: 'linear-gradient(to bottom, #1a1a2e, #000000)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '2rem',
          background: 'linear-gradient(to right, #00FF9D, #00F3FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        MASTERMIND
      </h1>
      <Game onComplete={handleComplete} />
      <div style={{ marginTop: '2rem', textAlign: 'center', color: '#aaa' }}>
        <p>Crack the color code in 10 tries or less</p>
        <p>Red = Right Color & Position • White = Right Color, Wrong Position</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
