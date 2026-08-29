import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type ItemNav = {
  nome: string;
  titulo: string;
  rota: '/' | '/agenda' | '/ajustes';
  icone: ComponentProps<typeof Ionicons>['name'];
};

// Fonte única das abas / itens da barra lateral. `admin` fica fora daqui
// porque é rota modal (aberta por botão), não um destino fixo de navegação.
export const ITENS_NAV: ItemNav[] = [
  { nome: 'index', titulo: 'Início', rota: '/', icone: 'home-outline' },
  { nome: 'agenda', titulo: 'Agenda', rota: '/agenda', icone: 'calendar-outline' },
  { nome: 'ajustes', titulo: 'Ajustes', rota: '/ajustes', icone: 'settings-outline' },
];
