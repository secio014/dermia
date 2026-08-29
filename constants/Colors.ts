// Paleta oficial do design system DermIA — tema "queimadura".
// Mantida em sincronia com as CSS variables em global.css / tailwind.config.js.
// Use estes valores onde não dá para usar className (ActivityIndicator,
// navegação, câmera). Para telas com NativeWind, prefira as classes (bg-fundo…).

const claro = {
  fundo: '#FFF5F4',
  superficie: '#FFFFFF',
  texto: '#2B0F0C',
  secundario: '#8A5A54',
  borda: '#F2D7D3',
  primaria: '#C81E3A',
  primariaSuave: '#FBE4E4',
  ok: '#0F9D6C',
  atencao: '#D97706',
  risco: '#B0121F',
};

const escuro = {
  fundo: '#1A0E0D',
  superficie: '#241413',
  texto: '#FCEBE9',
  secundario: '#C79A94',
  borda: '#3D2320',
  primaria: '#F0546B',
  primariaSuave: '#3A1A1C',
  ok: '#34D399',
  atencao: '#FBBF24',
  risco: '#FF6B6B',
};

export const paletas = { light: claro, dark: escuro } as const;

// Compat: `palette` continua apontando para o tema claro (usado em spinners etc.).
export const palette = claro;

export default {
  light: {
    text: claro.texto,
    background: claro.fundo,
    tint: claro.primaria,
    tabIconDefault: claro.secundario,
    tabIconSelected: claro.primaria,
  },
  dark: {
    text: escuro.texto,
    background: escuro.fundo,
    tint: escuro.primaria,
    tabIconDefault: escuro.secundario,
    tabIconSelected: escuro.primaria,
  },
};
