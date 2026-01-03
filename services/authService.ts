
import { User, GameState, CharacterId, DeviceType } from '../types';
import { CHARACTERS } from '../constants';

const USERS_KEY = 'juizo_db_usuarios'; // Chave única para o "banco de dados"
const SESSION_KEY = 'juizo_sessao_ativa';
const SAVE_PREFIX = 'juizo_save_';

export const authService = {
  // Banco de Dados: O LocalStorage é persistente entre sessões e recarregamentos
  register: (user: User, password: string): boolean => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u: any) => u.username === user.username)) return false;
    
    users.push({ ...user, password });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  },

  login: (username: string, password: string): User | null => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
      const { password, ...userData } = user;
      // Salva a sessão para não precisar logar de novo imediatamente
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      return userData;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  saveGame: (username: string, state: GameState) => {
    localStorage.setItem(`${SAVE_PREFIX}${username}`, JSON.stringify(state));
  },

  loadGame: (username: string): GameState | null => {
    const save = localStorage.getItem(`${SAVE_PREFIX}${username}`);
    return save ? JSON.parse(save) : null;
  },

  getInitialState: (): GameState => ({
    device: DeviceType.DESKTOP,
    currentChapter: 0,
    unlockedChapters: 1,
    feFragmentada: 0,
    selectedCharacter: CharacterId.AZIEL,
    inventory: [],
    hp: CHARACTERS[CharacterId.AZIEL].stats.hp,
    maxHp: CHARACTERS[CharacterId.AZIEL].stats.hp,
    lastCheckpointX: 100,
    upgrades: {
      attack: 0,
      health: 0,
      specialDuration: 0,
    }
  })
};
