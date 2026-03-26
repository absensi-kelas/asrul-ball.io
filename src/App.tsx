import React, { useState } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import { Difficulty } from './lib/types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameConfig, setGameConfig] = useState({
    mode: 'bot' as 'bot' | 'multiplayer',
    difficulty: 'normal' as Difficulty,
    name: '',
    color: '#FF5733',
    roomCode: '',
  });
  const [finalScore, setFinalScore] = useState(0);

  const handleStartGame = (mode: 'bot' | 'multiplayer', difficulty: Difficulty, name: string, color: string, roomCode: string = '') => {
    setGameConfig({ mode, difficulty, name, color, roomCode });
    setGameState('playing');
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState('gameover');
  };

  return (
    <div className="w-full h-[100dvh] bg-gray-950 overflow-hidden text-white font-sans">
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            <Menu onStartGame={handleStartGame} />
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <Game
              mode={gameConfig.mode}
              difficulty={gameConfig.difficulty}
              playerName={gameConfig.name}
              playerColor={gameConfig.color}
              roomCode={gameConfig.roomCode}
              onGameOver={handleGameOver}
              onQuit={() => setGameState('menu')}
            />
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-950/80 backdrop-blur-md z-50"
          >
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
              <h2 className="text-4xl font-black text-red-500 mb-2">YOU DIED</h2>
              <p className="text-gray-400 mb-6 font-medium">Final Score</p>
              <div className="text-6xl font-black text-white mb-8">{finalScore}</div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setGameState('menu')}
                  className="w-full bg-white text-gray-900 font-bold text-lg py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Back to Menu
                </button>
                <button
                  onClick={() => setGameState('playing')}
                  className="w-full bg-blue-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-blue-500 transition-colors"
                >
                  Play Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
