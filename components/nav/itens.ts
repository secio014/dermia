import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type ItemNav = {
  nome: string;
  titulo: string;
  rota: '/painel' | '/agenda' | '/ajustes';
  icone: ComponentProps<typeof Ionicons>['name'];
};

// Fonte única das abas / itens da barra lateral. `admin` fica fora daqui
// porque é rota modal (aberta por botão), não um destino fixo de navegação.
export const ITENS_NAV: ItemNav[] = [
  { nome: 'painel', titulo: 'Início', rota: '/painel', icone: 'home-outline' },
  { nome: 'agenda', titulo: 'Agenda', rota: '/agenda', icone: 'calendar-outline' },
  { nome: 'ajustes', titulo: 'Ajustes', rota: '/ajustes', icone: 'settings-outline' },
];

// Destinos fixos de navegação (chegou por menu, não por "entrar em algo") —
// nestes o header mostra a marca normal. Em qualquer outra rota (subpáginas
// como paciente/novo, consulta/[id], paciente/[id]/lesao/...) o header mostra
// "‹ Voltar" no lugar.
export const ROTAS_PRINCIPAIS = ['/', '/painel', '/agenda', '/ajustes', '/global', '/portal'];
