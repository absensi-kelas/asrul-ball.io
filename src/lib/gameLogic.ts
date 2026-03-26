import { Player, Food, GameState, Difficulty } from './types';

export const WORLD_SIZE = 3000;
export const INITIAL_RADIUS = 20;
export const MAX_SPEED = 1.5; // Slower for smoother movement
export const MIN_SPEED = 0.5; // Slower for smoother movement

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function randomColor() {
  const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#33FFF0', '#FFD433', '#FF33A8', '#33A8FF'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function generateBotName() {
  const prefixes = ['Zeek', 'Seeryu', 'Alpha', 'Omega', 'Rex', 'Luna', 'Nova', 'Cyber', 'Ghost', 'Ninja', 'Pro', 'Noob', 'Sniper', 'King', 'Queen', 'Dark', 'Light', 'Shadow', 'Storm', 'Fire'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${prefix}${suffix}`;
}

export function generateFood(count: number): Record<string, Food> {
  const foods: Record<string, Food> = {};
  for (let i = 0; i < count; i++) {
    const id = generateId();
    foods[id] = {
      id,
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      color: randomColor(),
    };
  }
  return foods;
}

export function updatePlayerPosition(player: Player, targetX: number, targetY: number, delta: number, speedMultiplier: number = 1) {
  // Smooth radius growth/shrink
  const targetRadius = INITIAL_RADIUS + Math.sqrt(player.score) * 2;
  player.radius += (targetRadius - player.radius) * delta * 5;

  // Apply physics for split/eject
  if (player.vx) {
    player.x += player.vx * delta * 60;
    player.vx *= 0.9;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
  }
  if (player.vy) {
    player.y += player.vy * delta * 60;
    player.vy *= 0.9;
    if (Math.abs(player.vy) < 0.1) player.vy = 0;
  }

  if (player.mergeTimer && player.mergeTimer > 0) {
    player.mergeTimer -= delta;
  }

  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > 0) {
    // Speed decreases as size increases
    const speed = Math.max(MIN_SPEED, MAX_SPEED - (player.radius - INITIAL_RADIUS) * 0.01) * speedMultiplier;
    const moveDistance = Math.min(speed * delta * 60, distance); // Normalize to 60fps
    
    if (!player.vx && !player.vy) {
      player.x += (dx / distance) * moveDistance;
      player.y += (dy / distance) * moveDistance;
    } else if (Math.abs(player.vx || 0) < 5 && Math.abs(player.vy || 0) < 5) {
      player.x += (dx / distance) * moveDistance;
      player.y += (dy / distance) * moveDistance;
    }
    
    // Clamp to world
    player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));
  }
}

export function updateFoodPhysics(state: GameState, delta: number) {
  for (const id in state.foods) {
    const food = state.foods[id];
    if (food.vx || food.vy) {
      food.x += (food.vx || 0) * delta * 60;
      food.y += (food.vy || 0) * delta * 60;
      food.vx = (food.vx || 0) * 0.95;
      food.vy = (food.vy || 0) * 0.95;
      
      if (Math.abs(food.vx) < 0.1) food.vx = 0;
      if (Math.abs(food.vy) < 0.1) food.vy = 0;

      food.x = Math.max(0, Math.min(WORLD_SIZE, food.x));
      food.y = Math.max(0, Math.min(WORLD_SIZE, food.y));
    }
  }
}

export function checkCollisions(state: GameState, cellId: string, onEaten: (id: string) => void): string[] {
  const me = state.players[cellId];
  if (!me) return [];

  const eatenFoods: string[] = [];

  // Check food collisions
  for (const foodId in state.foods) {
    const food = state.foods[foodId];
    const dx = me.x - food.x;
    const dy = me.y - food.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < me.radius) {
      eatenFoods.push(foodId);
      delete state.foods[foodId];
      me.score += 1;
    }
  }

  // Check player collisions
  for (const otherId in state.players) {
    if (otherId === cellId) continue;
    const other = state.players[otherId];
    
    const isSameGroup = (me.ownerId === other.ownerId && me.ownerId !== undefined) || 
                        me.ownerId === other.id || 
                        other.ownerId === me.id;
                        
    const dx = me.x - other.x;
    const dy = me.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (isSameGroup) {
      const canMerge = (!me.mergeTimer || me.mergeTimer <= 0) && (!other.mergeTimer || other.mergeTimer <= 0);
      
      if (distance < me.radius + other.radius) {
        if (canMerge) {
          if (me.radius > other.radius) {
            me.score += other.score;
            delete state.players[otherId];
            onEaten(otherId);
          }
        } else {
          // Push apart
          const overlap = (me.radius + other.radius) - distance;
          if (overlap > 0 && distance > 0) {
            const pushX = (dx / distance) * overlap * 0.05;
            const pushY = (dy / distance) * overlap * 0.05;
            me.x += pushX;
            me.y += pushY;
            other.x -= pushX;
            other.y -= pushY;
          }
        }
      }
      continue;
    }
    
    if (distance < me.radius && me.radius > other.radius * 1.1) {
      // I eat them
      me.score += other.score + 10;
      delete state.players[otherId];
      onEaten(otherId);
    } else if (distance < other.radius && other.radius > me.radius * 1.1) {
      // They eat me
      other.score += me.score + 10;
      delete state.players[cellId];
      onEaten(cellId);
      break;
    }
  }

  return eatenFoods;
}

export function updateBots(state: GameState, difficulty: Difficulty, delta: number) {
  for (const id in state.players) {
    const bot = state.players[id];
    if (!bot.isBot) continue;

    const distToTarget = (bot.targetX !== undefined && bot.targetY !== undefined)
      ? Math.sqrt(Math.pow(bot.targetX - bot.x, 2) + Math.pow(bot.targetY - bot.y, 2))
      : 0;

    if (bot.targetX === undefined || bot.targetY === undefined || distToTarget < 10 || Math.random() < 0.02) {
      if (difficulty === 'easy') {
        bot.targetX = Math.max(0, Math.min(WORLD_SIZE, bot.x + (Math.random() - 0.5) * 1000));
        bot.targetY = Math.max(0, Math.min(WORLD_SIZE, bot.y + (Math.random() - 0.5) * 1000));
      } else {
        // Find nearest food
        let nearestFood: Food | null = null;
        let minDistance = Infinity;
        
        for (const foodId in state.foods) {
          const food = state.foods[foodId];
          const dx = bot.x - food.x;
          const dy = bot.y - food.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDistance) {
            minDistance = dist;
            nearestFood = food;
          }
        }
        
        if (nearestFood) {
          bot.targetX = nearestFood.x;
          bot.targetY = nearestFood.y;
        } else {
          bot.targetX = Math.random() * WORLD_SIZE;
          bot.targetY = Math.random() * WORLD_SIZE;
        }
        
        if (difficulty === 'hard') {
          // Check for threats or prey
          let nearestThreat: Player | null = null;
          let nearestPrey: Player | null = null;
          let minThreatDist = Infinity;
          let minPreyDist = Infinity;
          
          for (const otherId in state.players) {
            if (otherId === id) continue;
            const other = state.players[otherId];
            const dx = bot.x - other.x;
            const dy = bot.y - other.y;
            const dist = dx * dx + dy * dy;
            
            if (other.radius > bot.radius * 1.1 && dist < minThreatDist) {
              minThreatDist = dist;
              nearestThreat = other;
            } else if (bot.radius > other.radius * 1.1 && dist < minPreyDist) {
              minPreyDist = dist;
              nearestPrey = other;
            }
          }
          
          if (nearestThreat && minThreatDist < 600 * 600) {
            // Run away
            const dx = bot.x - nearestThreat.x;
            const dy = bot.y - nearestThreat.y;
            bot.targetX = Math.max(0, Math.min(WORLD_SIZE, bot.x + dx));
            bot.targetY = Math.max(0, Math.min(WORLD_SIZE, bot.y + dy));
          } else if (nearestPrey && minPreyDist < 800 * 800) {
            // Chase
            bot.targetX = nearestPrey.x;
            bot.targetY = nearestPrey.y;
            
            // Bot splitting logic
            if ((difficulty === 'hard' || difficulty === 'normal') && bot.score > 40 && bot.radius > nearestPrey.radius * 1.5) {
              // If prey is at a catchable distance by splitting
              if (minPreyDist > 100 * 100 && minPreyDist < 600 * 600) {
                // Higher chance to split on hard, lower on normal
                const splitChance = difficulty === 'hard' ? 0.05 : 0.01;
                if (Math.random() < splitChance) { 
                  const rootId = bot.ownerId || bot.id;
                  splitPlayer(state, rootId, nearestPrey.x, nearestPrey.y);
                }
              }
            }
          }
        }
      }
    }
    
    const speedMultiplier = 1; // Base speed is already slowed down by 20% in MAX_SPEED/MIN_SPEED
    updatePlayerPosition(bot, bot.targetX !== undefined ? bot.targetX : bot.x, bot.targetY !== undefined ? bot.targetY : bot.y, delta, speedMultiplier);
  }
}

export function splitPlayer(state: GameState, myId: string, targetX: number, targetY: number): Player[] {
  const myCells = (Object.values(state.players) as Player[]).filter(p => p.id === myId || p.ownerId === myId);
  if (myCells.length >= 16) return [];

  const newCells: Player[] = [];

  myCells.forEach(cell => {
    if (cell.score < 20) return;

    cell.score = cell.score / 2;

    const dx = targetX - cell.x;
    const dy = targetY - cell.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    const newCellId = generateId();
    const newCell: Player = {
      ...cell,
      id: newCellId,
      ownerId: myId,
      x: cell.x + dirX * cell.radius,
      y: cell.y + dirY * cell.radius,
      vx: dirX * 20,
      vy: dirY * 20,
      mergeTimer: 10,
    };
    
    cell.mergeTimer = 10;

    state.players[newCellId] = newCell;
    newCells.push(newCell);
  });

  return newCells;
}

export function ejectMass(state: GameState, myId: string, targetX: number, targetY: number): Food[] {
  const myCells = (Object.values(state.players) as Player[]).filter(p => p.id === myId || p.ownerId === myId);
  const newFoods: Food[] = [];

  myCells.forEach(cell => {
    if (cell.score < 15) return;

    cell.score -= 5;

    const dx = targetX - cell.x;
    const dy = targetY - cell.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    const foodId = generateId();
    const food: Food = {
      id: foodId,
      x: cell.x + dirX * (cell.radius + 10),
      y: cell.y + dirY * (cell.radius + 10),
      color: cell.color,
      vx: dirX * 15,
      vy: dirY * 15,
    };

    state.foods[foodId] = food;
    newFoods.push(food);
  });

  return newFoods;
}
