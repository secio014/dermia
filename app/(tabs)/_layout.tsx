import { Platform, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { ITENS_NAV } from '@/components/nav/itens';
import WebShell from '@/components/nav/WebShell';
import BotaoTema from '@/components/ui/BotaoTema';
import LogoDermia from '@/components/ui/LogoDermia';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useTema } from '@/.lib/tema';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { cores } = useTema();
  const mostrarHeader = useClientOnlyValue(false, true);
  const larguraWeb = Platform.OS === 'web' && width >= 768;

  if (larguraWeb) {
    return <WebShell />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.secundario,
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda },
        headerStyle: { backgroundColor: cores.superficie },
        headerTintColor: cores.texto,
        headerShown: mostrarHeader,
        headerTitle: 'Derm.IA',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
            <BotaoTema size={20} />
            <LogoDermia size={22} />
          </View>
        ),
      }}>
      {ITENS_NAV.map((item) => (
        <Tabs.Screen
          key={item.nome}
          name={item.nome}
          options={{
            title: item.titulo,
            headerTitle: 'Derm.IA',
            tabBarIcon: ({ color }) => <Ionicons name={item.icone} size={24} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
