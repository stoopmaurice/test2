
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  LOADING = 'LOADING'
}

export enum Theme {
  CYBERPUNK = 'Cyberpunk Neon-Noir',
  FANTASY = 'High Fantasy Medieval',
  SPACE = 'Gothic Space Horror',
  APOCALYPSE = 'Post-Apocalyptic Wasteland'
}

export interface Player {
  name: string;
  health: number;
  level: number;
  xp: number;
  inventory: string[];
  theme: Theme;
}

export interface GameResponse {
  narrative: string;
  choices: string[];
  healthChange: number;
  xpReward: number;
  inventoryUpdate: {
    add: string[];
    remove: string[];
  };
  isGameOver: boolean;
  gameOverReason?: string;
}

export interface Message {
  role: 'system' | 'user' | 'ai';
  content: string;
  timestamp: number;
}
