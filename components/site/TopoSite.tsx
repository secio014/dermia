import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text, View } from 'react-native';

import LogoDermia from '@/components/ui/LogoDermia';
import { LARGURA_CONTEUDO, RECUO_CONTEUDO, useLargo } from '@/.lib/responsivo';
import { useTema, type PreferenciaTema } from '@/.lib/tema';

const EMAIL_COMERCIAL = 'comercial@dermia.tech';

const PROXIMO: Record<PreferenciaTema, PreferenciaTema> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};
const ICONE: Record<PreferenciaTema, React.ComponentProps<typeof Ionicons>['name']> = {
  light: 'sunny-outline',
  dark: 'moon-outline',
  system: 'contrast-outline',
};
const ROTULO: Record<PreferenciaTema, string> = {
  light: 'Tema: claro',
  dark: 'Tema: escuro',
  system: 'Tema: automático',
};

/**
 * Barra superior da landing pública: marca à esquerda; "Planos", "Contato",
 * alternador de tema (claro / escuro / automático) e o botão "Entrar" à direita.
 * Em telas estreitas some com os links de texto e mantém tema + Entrar.
 */
export default function TopoSite({ onPlanos }: { onPlanos: () => void }) {
  const router = useRouter();
  const largo = useLargo();
  const { preferencia, cores, escolher } = useTema();

  return (
    <View className="w-full border-b border-borda bg-superficie" style={{ alignItems: 'center' }}>
      <View
        className="flex-row items-center justify-between py-3"
        style={{
          width: '100%',
          maxWidth: LARGURA_CONTEUDO,
          paddingHorizontal: largo ? RECUO_CONTEUDO : 20,
        }}>
        <Pressable onPress={() => router.push('/')} className="flex-row items-center gap-2">
          <LogoDermia size={28} />
          <Text className="text-texto text-xl font-bold">DermIA</Text>
        </Pressable>

        <View className="flex-row items-center gap-4">
          {largo && (
            <>
              <Pressable onPress={onPlanos}>
                <Text className="text-secundario font-medium">Planos</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `mailto:${EMAIL_COMERCIAL}?subject=${encodeURIComponent('Contato — DermIA')}`
                  )
                }>
                <Text className="text-secundario font-medium">Contato</Text>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => escolher(PROXIMO[preferencia])}
            accessibilityLabel={ROTULO[preferencia]}
            className="w-9 h-9 items-center justify-center rounded-lg border border-borda">
            <Ionicons name={ICONE[preferencia]} size={18} color={cores.secundario} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/login')}
            className="bg-primaria rounded-xl px-4 py-2">
            <Text className="text-white font-semibold">Entrar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
