import React from "react";

interface GameOverProps {
  onRestart: () => void;
}

export default function GameOver({ onRestart }: GameOverProps) {
  return (
    <div className="game-over-container">
      <div className="game-over-modal">
        <h1>Game Over</h1>
        <p>You crashed into an obstacle!</p>
        <button onClick={onRestart}>Restart Game</button>
      </div>
    </div>
  );
}
