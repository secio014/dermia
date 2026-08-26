import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

export default function TelaAdmin() {
  const [papel, setPapel] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setCarregando(false);
      const { data: perfil } = await supabase
        .from('profissionais')
        .select('papel')
        .eq('id', data.user.id)
        .single();
      setPapel(perfil?.papel ?? null);
      setCarregando(false);
    });
  }, []);

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color="#0E5FD8" />
      </View>
    );
  }

  if (papel !== 'admin') {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-center">
          Este painel é restrito a administradores da clínica.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fundo items-center justify-center px-8">
      <Text className="text-texto text-xl font-bold mb-2 text-center">Painel de Admin</Text>
      <Text className="text-secundario text-center">
        Indicadores de adesão aos exercícios e tempo médio de cicatrização chegam na Etapa 4.
      </Text>
    </View>
  );
}
