// Cota grátis do Cloudflare Workers AI esgotada (10.000 neurons/dia). As edge
// functions já devolvem uma mensagem própria (prefixo LIMITE_IA:), mas também
// reconhecemos o erro cru da Cloudflare (code 4006) caso a função publicada
// ainda seja a versão antiga.

export const TITULO_LIMITE_IA = 'Limite gratuito da IA atingido';

export const TEXTO_LIMITE_IA =
  'A IA usou toda a cota grátis de hoje (10.000 "neurons" do plano gratuito do Cloudflare Workers AI). ' +
  'Ela volta a funcionar automaticamente às 21h (horário de Brasília). ' +
  'Para usar antes disso, é preciso assinar o plano pago da Cloudflare.';

export function ehLimiteIaGratis(texto: string | null | undefined): boolean {
  if (!texto) return false;
  return (
    texto.startsWith('LIMITE_IA: ') ||
    /Limite diário gratuito da IA/i.test(texto) ||
    /daily free allocation/i.test(texto) ||
    /"code"\s*:\s*4006/.test(texto)
  );
}
