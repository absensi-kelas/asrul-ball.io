import React, { useState, useEffect } from 'react';
import { Difficulty } from '../lib/types';
import { randomColor } from '../lib/gameLogic';
import { Play, Users, Settings, Plus, LogIn, Instagram } from 'lucide-react';
import { motion } from 'motion/react';

interface MenuProps {
  onStartGame: (mode: 'bot' | 'multiplayer', difficulty: Difficulty, name: string, color: string, roomCode?: string) => void;
}

export default function Menu({ onStartGame }: MenuProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(randomColor());
  const [mode, setMode] = useState<'bot' | 'multiplayer'>('bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [multiplayerAction, setMultiplayerAction] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');

  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#33FFF0', '#FFD433', '#FF33A8', '#33A8FF', '#FFFFFF', '#000000'];

  useEffect(() => {
    if (mode === 'multiplayer' && multiplayerAction === 'create') {
      // Generate a 6-digit numeric code
      setRoomCode(Math.floor(100000 + Math.random() * 900000).toString());
    } else if (mode === 'multiplayer' && multiplayerAction === 'join') {
      setRoomCode('');
    }
  }, [mode, multiplayerAction]);

  const handleStart = () => {
    if (mode === 'multiplayer' && multiplayerAction === 'join' && !roomCode) {
      alert('Please enter a room code');
      return;
    }
    onStartGame(mode, difficulty, name || 'Guest', color, mode === 'multiplayer' ? roomCode : undefined);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center p-4 font-sans text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-800 w-full max-w-md relative z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-2">
            <img 
              src="https://res.cloudinary.com/dl8sazvzw/image/upload/f_auto,q_auto/1387171_adrogb" 
              alt="Logo" 
              className="absolute -left-16 md:-left-24 w-20 h-20 md:w-28 md:h-28 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if image is not found
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent relative z-10">
              ball.io
            </h1>
          </div>
          <p className="text-gray-400 font-medium">Eat or be eaten.</p>
        </div>

        <div className="space-y-6">
          {/* Player Customization */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Player Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              maxLength={15}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-800 my-4" />

          {/* Game Mode */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Game Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('bot')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${mode === 'bot' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
              >
                <Settings className="w-6 h-6 mb-2" />
                <span className="font-bold">Vs Bots</span>
              </button>
              <button
                onClick={() => setMode('multiplayer')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${mode === 'multiplayer' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
              >
                <Users className="w-6 h-6 mb-2" />
                <span className="font-bold">Multiplayer</span>
              </button>
            </div>
          </div>

          {/* Difficulty (only for bot mode) */}
          {mode === 'bot' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-3 overflow-hidden"
            >
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-lg font-bold text-sm transition-all capitalize ${difficulty === d ? 'bg-gray-700 text-white shadow-inner' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Multiplayer Options */}
          {mode === 'multiplayer' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMultiplayerAction('create')}
                  className={`flex items-center justify-center p-3 rounded-xl border transition-all ${multiplayerAction === 'create' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  <span className="font-bold text-sm">Create Room</span>
                </button>
                <button
                  onClick={() => setMultiplayerAction('join')}
                  className={`flex items-center justify-center p-3 rounded-xl border transition-all ${multiplayerAction === 'join' ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  <span className="font-bold text-sm">Join Room</span>
                </button>
              </div>

              {multiplayerAction === 'create' ? (
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                  <p className="text-sm text-gray-400 mb-2">Share this code with your friend:</p>
                  <div className="text-4xl font-black tracking-widest text-white">{roomCode}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">Room Code</label>
                  <input 
                    type="text" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest font-black placeholder:font-normal placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
                    maxLength={6}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xl py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            <Play className="w-6 h-6 fill-current" />
            PLAY NOW
          </button>

          {/* Developer Social Links */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-800/50">
            <a 
              href="https://www.tiktok.com/@rull_segoyy?_r=1&_t=ZS-950QdW2suGb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              <span className="text-sm font-semibold tracking-wide">TikTok</span>
            </a>
            <a 
              href="https://www.instagram.com/asrul.jamsut?igsh=MW5yaXRpYzg3bnA3aw==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm font-semibold tracking-wide">Instagram</span>
            </a>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4 font-medium">
            ©asrul alfandi frist project in 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
