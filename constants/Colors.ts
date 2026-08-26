// Paleta oficial do design system DermIA (ver tailwind.config.js)
const palette = {
  fundo: '#F7F9FB',
  superficie: '#FFFFFF',
  texto: '#0F1B2D',
  secundario: '#5B6B7F',
  borda: '#DCE3EC',
  primaria: '#0E5FD8',
  ok: '#0F9D6C',
  atencao: '#D97706',
  risco: '#C81E3A',
};

export default {
  light: {
    text: palette.texto,
    background: palette.fundo,
    tint: palette.primaria,
    tabIconDefault: palette.secundario,
    tabIconSelected: palette.primaria,
  },
  dark: {
    text: palette.superficie,
    background: palette.texto,
    tint: palette.primaria,
    tabIconDefault: palette.secundario,
    tabIconSelected: palette.primaria,
  },
};

export { palette };
