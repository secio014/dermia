import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { LOGIN_DESATIVADO, PROFISSIONAL_TESTE_EMAIL, PROFISSIONAL_TESTE_SENHA } from '@/.lib/dev';
import { supabase } from '@/.lib/supabase';

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session && LOGIN_DESATIVADO) {
        // Sem tela de login, mas o RLS exige um auth.uid() válido — entra
        // silenciosamente com o profissional de teste (ver .lib/dev.ts).
        const { data: entrada } = await supabase.auth.signInWithPassword({
          email: PROFISSIONAL_TESTE_EMAIL,
          password: PROFISSIONAL_TESTE_SENHA,
        });
        setSessao(entrada.session);
      } else {
        setSessao(data.session);
      }
      setCarregando(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  return { sessao, carregando };
}
