export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  isBot?: boolean;
  score: number;
  targetX?: number;
  targetY?: number;
  ownerId?: string;
  vx?: number;
  vy?: number;
  mergeTimer?: number;
};

export type Food = {
  id: string;
  x: number;
  y: number;
  color: string;
  vx?: number;
  vy?: number;
};

export type GameState = {
  players: Record<string, Player>;
  foods: Record<string, Food>;
  worldSize: number;
};

export type Difficulty = 'easy' | 'normal' | 'hard';
