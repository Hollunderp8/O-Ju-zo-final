
import { CharacterId, Character } from './types';

export const GRAVITY = 0.5;
export const FRICTION = 0.8;
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;

export const CHARACTERS: Record<CharacterId, Character> = {
  [CharacterId.AZIEL]: {
    id: CharacterId.AZIEL,
    name: 'Padre Aziel Monteiro',
    country: 'Brasil',
    weapon: 'Crucifixo Pesado',
    specialAbility: 'Força Devocional',
    description: 'Um ex-boxeador que encontrou a fé nas favelas do Rio. Seus golpes carregam o peso do arrependimento.',
    stats: { hp: 150, attack: 25, speed: 4, jumpPower: 12 },
    color: '#34d399'
  },
  [CharacterId.TENZIN]: {
    id: CharacterId.TENZIN,
    name: 'Mestre Tenzin Rampa',
    country: 'Nepal',
    weapon: 'Bastão Espiritual',
    specialAbility: 'Respiração do Vazio',
    description: 'Guardião do silêncio nas montanhas. Capaz de dobrar o tempo e o espaço através da meditação.',
    stats: { hp: 100, attack: 15, speed: 6, jumpPower: 15 },
    color: '#fbbf24'
  },
  [CharacterId.ELIAS]: {
    id: CharacterId.ELIAS,
    name: 'Pastor Elias Kendrick',
    country: 'EUA',
    weapon: 'Ondas Sonoras',
    specialAbility: 'Grito de Avivamento',
    description: 'Voz trovejante que liderava multidões no Texas. Agora, seu som é uma arma contra o divino.',
    stats: { hp: 120, attack: 20, speed: 5, jumpPower: 10 },
    color: '#60a5fa'
  },
  [CharacterId.MAGDALENA]: {
    id: CharacterId.MAGDALENA,
    name: 'Irmã Magdalena de la Cruz',
    country: 'Espanha',
    weapon: 'Lâmina Sagrada',
    specialAbility: 'Lâmina do Exorcismo',
    description: 'Uma freira guerreira de uma ordem esquecida. Sua velocidade é comparada ao relâmpago divino.',
    stats: { hp: 110, attack: 22, speed: 7, jumpPower: 13 },
    color: '#f87171'
  },
  [CharacterId.HIROSHI]: {
    id: CharacterId.HIROSHI,
    name: 'Padre Hiroshi Nakamura',
    country: 'Japão',
    weapon: 'Talismãs',
    specialAbility: 'Selo de Purificação',
    description: 'Sacerdote que combina tradições ancestrais com exorcismos modernos. Especialista em distância.',
    stats: { hp: 90, attack: 18, speed: 5.5, jumpPower: 11 },
    color: '#c084fc'
  },
  [CharacterId.DAVI]: {
    id: CharacterId.DAVI,
    name: 'Davi Bem Sahar',
    country: 'Israel',
    weapon: 'Símbolos Místicos',
    specialAbility: 'Selo de Salomão',
    description: 'Estudioso da Cabala que usa o conhecimento antigo para aprisionar seres de luz.',
    stats: { hp: 100, attack: 20, speed: 4.5, jumpPower: 10 },
    color: '#2dd4bf'
  }
};

export const CHAPTERS = [
  { id: 1, name: 'Brasil', location: 'Catedrais em Ruínas', boss: 'O Anjo da Lapa' },
  { id: 2, name: 'Nepal', location: 'Mosteiros Suspensos', boss: 'O Olho do Vazio' },
  { id: 3, name: 'EUA', location: 'Megaigrejas Colapsadas', boss: 'Pastor da Ganância' },
  { id: 4, name: 'Espanha', location: 'Catedrais Góticas em Chamas', boss: 'Inquisidor de Luz' },
  { id: 5, name: 'Japão', location: 'Templos Distorcidos', boss: 'Kami Fragmentado' },
  { id: 6, name: 'Israel', location: 'Ruínas Sagradas', boss: 'Selo Quebrado' },
  { id: 7, name: 'Final', location: 'O Céu Rasgado', boss: 'A Sentinela Primordial' }
];
