import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ITENS_NAV } from '@/components/nav/itens';
import { usePapelEfetivo } from '@/.lib/acesso';
import { useTema } from '@/.lib/tema';
import { definirVisao, type VisaoSimulada } from '@/.lib/visao';

const OPCOES_VER_COMO: [VisaoSimulada, string][] = [
  ['admin', 'Admin'],
  ['fisioterapeuta', 'Fisio'],
  ['estagiario', 'Estag.'],
  ['paciente', 'Pac.'],
];

/**
 * Botão de menu para o header padrão (fora da barra lateral): destinos fixos
 * (Início/Agenda/Ajustes) mais Admin/Visão global/Site/"Ver como" conforme o
 * papel REAL do usuário (não o efetivo/simulado — o admin_geral não pode
 * perder o próprio acesso ao trocar de visão).
 */
export default function BotaoMenuNav({ alinhar = 'left' }: { alinhar?: 'left' | 'right' }) {
  const { papelReal, simulando } = usePapelEfetivo();
  const router = useRouter();
  const { cores } = useTema();
  const [aberto, setAberto] = useState(false);

  function ir(rota: string) {
    setAberto(false);
    router.push(rota as never);
  }

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityLabel="Menu"
        style={alinhar === 'left' ? { marginLeft: 8 } : { marginRight: 8 }}>
        <Ionicons name="menu" size={22} color={cores.secundario} />
      </Pressable>
      <Modal transparent visible={aberto} animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setAberto(false)}>
          <View
            style={{
              position: 'absolute',
              top: 56,
              ...(alinhar === 'left' ? { left: 12 } : { right: 12 }),
              minWidth: 210,
              borderRadius: 12,
              paddingVertical: 6,
              backgroundColor: cores.superficie,
              borderWidth: 1,
              borderColor: cores.secundario + '33',
            }}>
            {ITENS_NAV.map((item) => (
              <ItemMenu
                key={item.nome}
                icone={item.icone}
                rotulo={item.titulo}
                cores={cores}
                onPress={() => ir(item.rota)}
              />
            ))}
            {papelReal === 'admin_geral' && (
              <ItemMenu
                icone="planet-outline"
                rotulo="Visão global"
                cores={cores}
                onPress={() => ir('/global')}
              />
            )}
            {(papelReal === 'admin' || papelReal === 'admin_geral') && (
              <ItemMenu
                icone="shield-checkmark-outline"
                rotulo="Admin"
                cores={cores}
                onPress={() => ir('/admin')}
              />
            )}
            {papelReal === 'admin_geral' && (
              <ItemMenu
                icone="globe-outline"
                rotulo="Site (landing page)"
                cores={cores}
                onPress={() => ir('/')}
              />
            )}

            {papelReal === 'admin_geral' && (
              <>
                <View style={{ height: 1, backgroundColor: cores.secundario + '22', marginVertical: 6 }} />
                <Text
                  style={{
                    color: cores.secundario,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: 0.8,
                    paddingHorizontal: 14,
                    marginBottom: 6,
                  }}>
                  Ver como
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 8 }}>
                  {OPCOES_VER_COMO.map(([v, rotulo]) => {
                    const ligado = simulando === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => definirVisao(ligado ? null : v)}
                        style={{
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: ligado ? cores.primaria : 'transparent',
                          borderWidth: ligado ? 0 : 1,
                          borderColor: cores.secundario + '55',
                        }}>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: ligado ? '#fff' : cores.secundario,
                          }}>
                          {rotulo}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ItemMenu({
  icone,
  rotulo,
  cores,
  onPress,
}: {
  icone: React.ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  cores: { secundario: string };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={rotulo}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
      <Ionicons name={icone} size={18} color={cores.secundario} />
      <Text className="text-texto font-medium">{rotulo}</Text>
    </Pressable>
  );
}
