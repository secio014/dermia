// TODO: remover este arquivo inteiro quando o novo fluxo de login estiver pronto.

// Enquanto true, a tela de login fica escondida e o app autentica sozinho com
// o profissional de teste abaixo (useSessao.ts) — sem isso o RLS, baseado em
// auth.uid(), bloquearia toda leitura/escrita no Supabase.
//
// `__DEV__` é true no `expo start` (dev) e false no `expo export` / build EAS.
// Ou seja: no desenvolvimento continua entrando direto como o profissional de
// teste; no build de produção a tela de login real aparece.
export const LOGIN_DESATIVADO = __DEV__;

// Credenciais do profissional de teste criado manualmente em auth.users.
export const PROFISSIONAL_TESTE_EMAIL = 'teste@dermia.local';
export const PROFISSIONAL_TESTE_SENHA = 'senha-teste-123';
