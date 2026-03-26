import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, GameState, Difficulty, Food } from '../lib/types';
import { WORLD_SIZE, INITIAL_RADIUS, generateId, randomColor, generateFood, updatePlayerPosition, checkCollisions, updateBots, splitPlayer, ejectMass, updateFoodPhysics, generateBotName } from '../lib/gameLogic';
import { supabase } from '../lib/supabase';
import { Trophy, Users, AlertCircle, Maximize2, Minimize2, Target, Divide, LogOut } from 'lucide-react';

interface GameProps {
  mode: 'bot' | 'multiplayer';
  difficulty: Difficulty;
  playerName: string;
  playerColor: string;
  roomCode?: string;
  onGameOver: (score: number) => void;
  onQuit?: () => void;
}

export default function Game({ mode, difficulty, playerName, playerColor, roomCode, onGameOver, onQuit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false); // Default hidden on mobile, can be toggled
  const myScoreRef = useRef(0);
  const [isDeadState, setIsDeadState] = useState(false);
  const isDeadRef = useRef(false);
  const scoreDisplayRef = useRef<HTMLSpanElement>(null);
  
  const myIdRef = useRef(generateId());
  const stateRef = useRef<GameState>({
    players: {},
    foods: {},
    worldSize: WORLD_SIZE,
  });
  
  const mouseRef = useRef({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const cameraRef = useRef({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 });
  const lastTimeRef = useRef(performance.now());
  const channelRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number>(0);

  const joystickRef = useRef({ active: false, id: null as number | null, x: 0, y: 0, baseX: 0, baseY: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const lastLeaderboardUpdateRef = useRef(0);

  useEffect(() => {
    // Show leaderboard by default on larger screens
    if (window.innerWidth > 768) {
      setShowLeaderboard(true);
    }
  }, []);

  const render = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to window if needed
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;
    const zoom = cameraRef.current.zoom;

    const viewWidth = canvas.width / zoom;
    const viewHeight = canvas.height / zoom;
    const viewHalfWidth = viewWidth / 2;
    const viewHalfHeight = viewHeight / 2;

    // Clear background
    ctx.fillStyle = '#111827'; // Tailwind gray-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    // Draw grid
    ctx.strokeStyle = '#1F2937'; // Tailwind gray-800
    ctx.lineWidth = 1;
    const gridSize = 50;
    const startX = Math.floor((camX - viewHalfWidth) / gridSize) * gridSize;
    const startY = Math.floor((camY - viewHalfHeight) / gridSize) * gridSize;
    const endX = startX + viewWidth + gridSize * 2;
    const endY = startY + viewHeight + gridSize * 2;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Draw world border
    ctx.strokeStyle = '#EF4444'; // Red border
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Draw food
    for (const foodId in state.foods) {
      const food = state.foods[foodId];
      // Only draw if in view
      if (
        food.x > camX - viewHalfWidth - 20 && food.x < camX + viewHalfWidth + 20 &&
        food.y > camY - viewHalfHeight - 20 && food.y < camY + viewHalfHeight + 20
      ) {
        ctx.beginPath();
        ctx.arc(food.x, food.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = food.color;
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = food.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw players (sort by radius so smaller are drawn first)
    const players = (Object.values(state.players) as Player[]).sort((a, b) => a.radius - b.radius);
    for (const player of players) {
      // Only draw if in view
      if (
        player.x > camX - viewHalfWidth - player.radius * 2 && player.x < camX + viewHalfWidth + player.radius * 2 &&
        player.y > camY - viewHalfHeight - player.radius * 2 && player.y < camY + viewHalfHeight + player.radius * 2
      ) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.stroke();

        // Draw crosshair for my cells
        if (player.id === myIdRef.current || player.ownerId === myIdRef.current) {
          const dx = mouseRef.current.x - player.x;
          const dy = mouseRef.current.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 10) {
            const dirX = dx / dist;
            const dirY = dy / dist;
            
            // Draw a subtle dashed line indicating direction
            ctx.beginPath();
            ctx.moveTo(player.x + dirX * player.radius, player.y + dirY * player.radius);
            ctx.lineTo(player.x + dirX * (player.radius + 30), player.y + dirY * (player.radius + 30));
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw a small arrow head
            ctx.beginPath();
            const arrowX = player.x + dirX * (player.radius + 30);
            const arrowY = player.y + dirY * (player.radius + 30);
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - dirX * 8 - dirY * 5, arrowY - dirY * 8 + dirX * 5);
            ctx.lineTo(arrowX - dirX * 8 + dirY * 5, arrowY - dirY * 8 - dirX * 5);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
          }
        }

        // Draw name
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(12, player.radius * 0.4)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.name, player.x, player.y);
        
        // Draw score
        ctx.font = `${Math.max(10, player.radius * 0.3)}px Inter, sans-serif`;
        ctx.fillText(player.score.toString(), player.x, player.y + player.radius * 0.5);
      }
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    const myId = myIdRef.current;
    
    // Initialize my player
    stateRef.current.players[myId] = {
      id: myId,
      name: playerName || 'Player',
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      radius: INITIAL_RADIUS,
      color: playerColor,
      score: 0,
    };

    cameraRef.current = { x: stateRef.current.players[myId].x, y: stateRef.current.players[myId].y, zoom: 1 };

    if (mode === 'bot') {
      // Initialize bots
      const numBots = 20;
      for (let i = 0; i < numBots; i++) {
        const botId = generateId();
        const score = Math.floor(Math.random() * 50);
        stateRef.current.players[botId] = {
          id: botId,
          name: generateBotName(),
          x: Math.random() * WORLD_SIZE,
          y: Math.random() * WORLD_SIZE,
          radius: INITIAL_RADIUS + Math.sqrt(score) * 2,
          color: randomColor(),
          isBot: true,
          score: score,
        };
      }
      
      // Initialize food
      stateRef.current.foods = generateFood(300);
    } else if (mode === 'multiplayer') {
      // Setup Supabase Realtime
      const channelName = roomCode ? `game_room_${roomCode}` : 'game_room';
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: myId },
        },
      });
      
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'player_update' }, (payload) => {
          const remotePlayer = payload.payload as Player;
          if (remotePlayer.id !== myId) {
            stateRef.current.players[remotePlayer.id] = remotePlayer;
          }
        })
        .on('broadcast', { event: 'food_eaten' }, (payload) => {
          const { foodId } = payload.payload;
          delete stateRef.current.foods[foodId];
        })
        .on('broadcast', { event: 'player_eaten' }, (payload) => {
          const { eatenId } = payload.payload;
          delete stateRef.current.players[eatenId];
        })
        .on('broadcast', { event: 'food_sync' }, (payload) => {
          const { foods } = payload.payload;
          Object.assign(stateRef.current.foods, foods);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Request initial state from others or generate food if alone
            const newFoods = generateFood(200);
            stateRef.current.foods = newFoods;
            channel.send({
              type: 'broadcast',
              event: 'food_sync',
              payload: { foods: newFoods },
            });
          }
        });
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || joystickRef.current.active) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const me = stateRef.current.players[myId];
      if (!me) return;

      // Convert screen coordinates to world coordinates
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      
      const canvasCenterX = rect.width / 2;
      const canvasCenterY = rect.height / 2;
      
      mouseRef.current = {
        x: cameraRef.current.x + (screenX - canvasCenterX) / cameraRef.current.zoom,
        y: cameraRef.current.y + (screenY - canvasCenterY) / cameraRef.current.zoom,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Find a touch that is on the left side of the screen for joystick
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX < window.innerWidth / 2 && !joystickRef.current.active) {
          joystickRef.current = {
            active: true,
            id: touch.identifier,
            baseX: touch.clientX,
            baseY: touch.clientY,
            x: touch.clientX,
            y: touch.clientY
          };
          
          if (joystickBaseRef.current && joystickKnobRef.current) {
            joystickBaseRef.current.style.display = 'block';
            joystickBaseRef.current.style.left = `${touch.clientX - 50}px`;
            joystickBaseRef.current.style.top = `${touch.clientY - 50}px`;
            joystickKnobRef.current.style.left = `30px`; // 50 - 20
            joystickKnobRef.current.style.top = `30px`;
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickRef.current.active) return;
      
      // Prevent scrolling/zooming while using joystick
      if (e.cancelable) {
        e.preventDefault();
      }
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickRef.current.id) {
          joystickRef.current.x = touch.clientX;
          joystickRef.current.y = touch.clientY;
          
          if (joystickKnobRef.current) {
            const dx = touch.clientX - joystickRef.current.baseX;
            const dy = touch.clientY - joystickRef.current.baseY;
            const clampedX = Math.max(-50, Math.min(50, dx));
            const clampedY = Math.max(-50, Math.min(50, dy));
            joystickKnobRef.current.style.left = `${50 + clampedX - 20}px`;
            joystickKnobRef.current.style.top = `${50 + clampedY - 20}px`;
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickRef.current.id) {
          joystickRef.current.active = false;
          joystickRef.current.id = null;
          
          if (joystickBaseRef.current) {
            joystickBaseRef.current.style.display = 'none';
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    const gameLoop = (time: number) => {
      if (isDeadRef.current) return;
      
      const rawDelta = (time - lastTimeRef.current) / 1000;
      const delta = Math.min(rawDelta, 0.1); // Clamp delta to max 100ms to prevent physics explosions
      lastTimeRef.current = time;

      const state = stateRef.current;
      
      updateFoodPhysics(state, delta);

      const myCells = (Object.values(state.players) as Player[]).filter(p => p.id === myId || p.ownerId === myId);

      if (myCells.length > 0) {
        let totalX = 0;
        let totalY = 0;
        let totalScore = 0;

        if (joystickRef.current.active) {
          const dx = joystickRef.current.x - joystickRef.current.baseX;
          const dy = joystickRef.current.y - joystickRef.current.baseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) { // Deadzone to prevent jitter
            const maxDist = 50;
            const pull = Math.min(dist, maxDist) / maxDist;
            
            // Use the first cell as reference for joystick direction
            const refCell = myCells[0];
            mouseRef.current = {
              x: refCell.x + (dx / dist) * pull * 500,
              y: refCell.y + (dy / dist) * pull * 500,
            };
          }
        }

        const speedMultiplier = 1; // Base speed is already slowed down by 20% in MAX_SPEED/MIN_SPEED
        myCells.forEach(cell => {
          updatePlayerPosition(cell, mouseRef.current.x, mouseRef.current.y, delta, speedMultiplier);
          totalX += cell.x;
          totalY += cell.y;
          totalScore += cell.score;

          const eatenFoods = checkCollisions(state, cell.id, (eatenId) => {
            if (mode === 'multiplayer' && channelRef.current) {
              channelRef.current.send({
                type: 'broadcast',
                event: 'player_eaten',
                payload: { eatenId },
              });
            }
          });

          if (mode === 'multiplayer' && channelRef.current && eatenFoods.length > 0) {
            eatenFoods.forEach(foodId => {
              channelRef.current.send({
                type: 'broadcast',
                event: 'food_eaten',
                payload: { foodId },
              });
            });
          }
        });

        const centerX = totalX / myCells.length;
        const centerY = totalY / myCells.length;
        cameraRef.current.x += (centerX - cameraRef.current.x) * 0.05;
        cameraRef.current.y += (centerY - cameraRef.current.y) * 0.05;

        // Calculate target zoom based on total mass and spread
        let maxDistSq = 0;
        for (let i = 0; i < myCells.length; i++) {
          const dx = myCells[i].x - centerX;
          const dy = myCells[i].y - centerY;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) maxDistSq = distSq;
        }
        
        const spreadRadius = Math.sqrt(maxDistSq);
        // Base zoom on the largest cell or the spread of cells, whichever is larger
        const maxCellRadius = Math.max(...myCells.map(c => c.radius));
        const effectiveRadius = Math.max(maxCellRadius, spreadRadius + maxCellRadius);
        
        // Calculate target zoom (smaller zoom value = zoomed out more)
        // Base zoom is 1.0 for a starting cell (radius ~20)
        // As effective radius grows, zoom decreases
        const targetZoom = Math.max(0.2, Math.min(1.5, 40 / effectiveRadius));
        
        // Smooth zoom transition
        cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.02;

        if (Math.floor(totalScore) !== Math.floor(myScoreRef.current)) {
          if (scoreDisplayRef.current) {
            scoreDisplayRef.current.innerText = `SCORE: ${Math.floor(totalScore)}`;
          }
        }
        myScoreRef.current = totalScore;

        if (mode === 'multiplayer' && channelRef.current) {
          if (Math.random() < 0.2) {
            myCells.forEach(cell => {
              channelRef.current.send({
                type: 'broadcast',
                event: 'player_update',
                payload: cell,
              });
            });
          }
        }
      } else {
        // All my cells are dead
        isDeadRef.current = true;
        setIsDeadState(true);
        cancelAnimationFrame(animationFrameIdRef.current);
        onGameOver(Math.floor(myScoreRef.current));
      }

      if (mode === 'bot') {
        updateBots(state, difficulty, delta);
        
        // Bots need to eat too!
        for (const id in state.players) {
          if (state.players[id].isBot) {
            checkCollisions(state, id, () => {});
          }
        }
        
        // Respawn bots
        const currentBots = Object.values(state.players).filter(p => p.isBot).length;
        const targetBots = 20;
        if (currentBots < targetBots && Math.random() < 0.05) {
          const botId = generateId();
          const score = Math.floor(Math.random() * 20);
          state.players[botId] = {
            id: botId,
            name: generateBotName(),
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            radius: INITIAL_RADIUS + Math.sqrt(score) * 2,
            color: randomColor(),
            isBot: true,
            score: score,
          };
        }

        // Replenish food
        if (Object.keys(state.foods).length < 300) {
          const newFood = generateFood(5);
          Object.assign(state.foods, newFood);
        }
      } else if (mode === 'multiplayer') {
        // Replenish food occasionally
        if (Object.keys(state.foods).length < 200 && Math.random() < 0.05) {
          const newFood = generateFood(1);
          Object.assign(state.foods, newFood);
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'food_sync',
              payload: { foods: newFood },
            });
          }
        }
      }

      // Update leaderboard (throttle UI updates)
      const now = performance.now();
      if (now - lastLeaderboardUpdateRef.current > 500) {
        const sortedPlayers = (Object.values(state.players) as Player[]).sort((a, b) => b.score - a.score).slice(0, 10);
        setLeaderboard(sortedPlayers);
        lastLeaderboardUpdateRef.current = now;
      }

      // Render
      render(state);
      
      // Render Minimap
      const minimapCanvas = minimapRef.current;
      if (minimapCanvas) {
        const mctx = minimapCanvas.getContext('2d');
        if (mctx) {
          mctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
          
          // Draw background
          mctx.fillStyle = 'rgba(17, 24, 39, 0.8)'; // gray-900 with opacity
          mctx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
          
          const scale = minimapCanvas.width / WORLD_SIZE;
          
          // Draw all players
          for (const id in state.players) {
            const p = state.players[id];
            mctx.beginPath();
            mctx.arc(p.x * scale, p.y * scale, Math.max(2, p.radius * scale), 0, Math.PI * 2);
            mctx.fillStyle = p.color;
            mctx.fill();
            
            // Highlight my cells
            if (p.id === myId || p.ownerId === myId) {
              mctx.strokeStyle = '#ffffff';
              mctx.lineWidth = 1.5;
              mctx.stroke();
            }
          }
          
          // Draw camera view rect
          if (canvasRef.current) {
            const zoom = cameraRef.current.zoom;
            const viewWidth = canvasRef.current.width / zoom;
            const viewHeight = canvasRef.current.height / zoom;
            const viewX = cameraRef.current.x - viewWidth / 2;
            const viewY = cameraRef.current.y - viewHeight / 2;
            
            mctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            mctx.lineWidth = 1;
            mctx.strokeRect(viewX * scale, viewY * scale, viewWidth * scale, viewHeight * scale);
          }
        }
      }

      if (!isDeadRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      cancelAnimationFrame(animationFrameIdRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [mode, difficulty, playerName, playerColor, onGameOver, render]);

  const handleSplit = () => {
    if (isDeadRef.current) return;
    const myId = myIdRef.current;
    
    const newCells = splitPlayer(stateRef.current, myId, mouseRef.current.x, mouseRef.current.y);
    if (newCells.length > 0 && mode === 'multiplayer' && channelRef.current) {
      newCells.forEach(cell => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_update',
          payload: cell,
        });
      });
      // Update existing cells
      const myCells = (Object.values(stateRef.current.players) as Player[]).filter(p => p.id === myId || p.ownerId === myId);
      myCells.forEach(cell => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_update',
          payload: cell,
        });
      });
    }
  };

  const handleEject = () => {
    if (isDeadRef.current) return;
    const myId = myIdRef.current;
    
    const newFoods = ejectMass(stateRef.current, myId, mouseRef.current.x, mouseRef.current.y);
    if (newFoods.length > 0 && mode === 'multiplayer' && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'food_sync',
        payload: { foods: newFoods.reduce((acc, f) => ({...acc, [f.id]: f}), {}) },
      });
      const myCells = (Object.values(stateRef.current.players) as Player[]).filter(p => p.id === myId || p.ownerId === myId);
      myCells.forEach(cell => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_update',
          payload: cell,
        });
      });
    }
  };

  // Keyboard controls for split/eject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        handleSplit();
      } else if (e.code === 'KeyW') {
        handleEject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-gray-800/80 backdrop-blur-md p-2 rounded-lg border border-gray-700 shadow-xl text-white pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          <span ref={scoreDisplayRef} className="font-bold text-sm">SCORE: 0</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <Users className="w-3.5 h-3.5" />
          <span>MODE: {mode === 'bot' ? `Vs Bots (${difficulty})` : 'Multiplayer'}</span>
        </div>
        {mode === 'multiplayer' && roomCode && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 mt-1">
            <span className="font-bold">ROOM: {roomCode}</span>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex gap-2">
          {onQuit && (
            <button 
              onClick={onQuit}
              className="pointer-events-auto bg-red-600/80 backdrop-blur-md p-2 rounded-xl border border-red-500 shadow-xl text-white hover:bg-red-500 transition-colors"
              title="Quit Game"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="pointer-events-auto bg-gray-800/80 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-xl text-white hover:bg-gray-700 transition-colors"
            title="Toggle Leaderboard"
          >
            {showLeaderboard ? <Minimize2 className="w-5 h-5" /> : <Trophy className="w-5 h-5 text-yellow-400" />}
          </button>
        </div>

        {showLeaderboard && (
          <div className="w-64 bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-700 shadow-xl overflow-hidden pointer-events-auto">
            <div className="bg-gray-700/50 p-3 border-b border-gray-600 font-bold text-white text-center flex justify-between items-center">
              <span>Leaderboard</span>
            </div>
            <div className="p-2 max-h-[40vh] overflow-y-auto">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex justify-between items-center p-2 rounded ${p.id === myIdRef.current || p.ownerId === myIdRef.current ? 'bg-blue-500/20 text-blue-300 font-bold' : 'text-gray-300'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs opacity-50 w-4">{i + 1}.</span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                    <span className="truncate max-w-[100px]">{p.name}</span>
                  </div>
                  <span className="text-sm">{Math.floor(p.score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="absolute bottom-8 right-8 flex gap-4 pointer-events-auto md:hidden z-20">
        <button 
          onClick={handleEject}
          className="w-16 h-16 rounded-full bg-gray-800/80 backdrop-blur-md border border-gray-600 flex items-center justify-center text-white shadow-xl active:bg-gray-700"
        >
          <Target className="w-8 h-8" />
        </button>
        <button 
          onClick={handleSplit}
          className="w-16 h-16 rounded-full bg-blue-600/80 backdrop-blur-md border border-blue-500 flex items-center justify-center text-white shadow-xl active:bg-blue-700"
        >
          <Divide className="w-8 h-8" />
        </button>
      </div>

      {/* Desktop Hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 text-sm pointer-events-none hidden md:flex gap-6 bg-gray-900/50 px-4 py-2 rounded-full backdrop-blur-sm z-20">
        <span><kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-xs mr-1">Space</kbd> Split</span>
        <span><kbd className="bg-gray-800 px-2 py-1 rounded border border-gray-700 text-xs mr-1">W</kbd> Eject Mass</span>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-[120px] md:bottom-8 right-4 md:right-8 pointer-events-none bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-lg overflow-hidden shadow-2xl z-10" style={{ width: 100, height: 100 }}>
        <canvas ref={minimapRef} width={100} height={100} className="w-full h-full" />
      </div>

      {/* Virtual Joystick UI */}
      <div 
        ref={joystickBaseRef}
        className="absolute rounded-full border-2 border-white/20 bg-black/20 pointer-events-none"
        style={{
          display: 'none',
          width: 100,
          height: 100,
        }}
      >
        <div 
          ref={joystickKnobRef}
          className="absolute rounded-full bg-white/50 w-10 h-10"
        />
      </div>
    </div>
  );
}
