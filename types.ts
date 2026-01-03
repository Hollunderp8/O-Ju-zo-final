
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet'
}

export enum CharacterId {
  AZIEL = 'aziel',
  TENZIN = 'tenzin',
  ELIAS = 'elias',
  MAGDALENA = 'magdalena',
  HIROSHI = 'hiroshi',
  DAVI = 'davi'
}

export interface User {
  username: string;
  email: string;
  profilePic: string;
  password?: string; // Em um app real, nunca retornaríamos a senha
}

export interface Character {
  id: CharacterId;
  name: string;
  country: string;
  weapon: string;
  specialAbility: string;
  description: string;
  stats: {
    hp: number;
    attack: number;
    speed: number;
    jumpPower: number;
  };
  color: string;
}

export interface GameState {
  device: DeviceType;
  currentChapter: number;
  unlockedChapters: number;
  feFragmentada: number;
  selectedCharacter: CharacterId;
  inventory: string[];
  hp: number;
  maxHp: number;
  lastCheckpointX: number; // Nova propriedade para save de posição
  upgrades: {
    attack: number;
    health: number;
    specialDuration: number;
  };
}

export enum GameStatus {
  AUTH = 'auth', // Nova tela inicial
  DEVICE_SELECTION = 'device_selection',
  START_SCREEN = 'start_screen',
  STORY_LETTER = 'story_letter',
  MENU = 'menu',
  CUTSCENE = 'cutscene',
  PLAYING = 'playing',
  UPGRADE = 'upgrade',
  BOSS_FIGHT = 'boss_fight',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

export interface Enemy {
  id: string;
  type: 'CORRUPTED' | 'ANGEL' | 'CHERUB' | 'HERALD' | 'BOSS';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  speed: number;
  state: 'idle' | 'patrol' | 'aggro' | 'attack' | 'dead';
  direction: number;
  lastAttack: number;
  attackCooldown?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  owner: 'player' | 'enemy';
}
