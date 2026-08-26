import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import { palette } from '@/constants/Colors';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function Icone(ios: string, android: string) {
  return function TabIcon({ color }: { color: any }) {
    return (
      <SymbolView
        name={{ ios, android, web: android } as never}
        tintColor={color as string}
        size={26}
      />
    );
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primaria,
        tabBarInactiveTintColor: palette.secundario,
        tabBarStyle: { backgroundColor: palette.superficie, borderTopColor: palette.borda },
        headerStyle: { backgroundColor: palette.superficie },
        headerTintColor: palette.texto,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: Icone('house', 'home') }}
      />
      <Tabs.Screen
        name="camera"
        options={{ title: 'Câmera', tabBarIcon: Icone('camera', 'camera') }}
      />
      <Tabs.Screen
        name="mapa-corporal"
        options={{ title: 'Mapa Corporal', tabBarIcon: Icone('figure.stand', 'accessibility') }}
      />
      <Tabs.Screen
        name="evolucao"
        options={{ title: 'Evolução', tabBarIcon: Icone('chart.line.uptrend.xyaxis', 'trending-up') }}
      />
    </Tabs>
  );
}
