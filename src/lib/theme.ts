import { Platform } from 'react-native';

export const C = {
  bg: '#F5EDE1',
  card: '#FFFaF2',
  text: '#3B2A21',
  textSoft: '#86705F',
  border: '#E6D8C4',
  accent: '#7A5A3A',
  olive: '#6E7D3C',
  danger: '#A9473A',
  chip: '#EFE3D1',
};

export const serif = Platform.select({ web: 'Georgia, "Iowan Old Style", serif', default: 'Georgia' });

export const TEA_TYPES = ['Čierny', 'Zelený', 'Oolong', 'Biely', 'Pu-erh', 'Bylinný', 'Iný'] as const;
export type TeaType = (typeof TEA_TYPES)[number];

export const TYPE_COLORS: Record<TeaType, string> = {
  Čierny: '#8B4A2B',
  Zelený: '#7A8F45',
  Oolong: '#B7853A',
  Biely: '#BBA582',
  'Pu-erh': '#5E3B2E',
  Bylinný: '#A2587A',
  Iný: '#86705F',
};
