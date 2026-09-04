import { useRef } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import AoAparecer from '@/components/site/AoAparecer';
import CartaoHover from '@/components/site/CartaoHover';
import CartaoPlano, { type Plano } from '@/components/site/CartaoPlano';
import TopoSite from '@/components/site/TopoSite';
import LogoDermia from '@/components/ui/LogoDermia';
import { LARGURA_CONTEUDO, RECUO_CONTEUDO, useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';

const EMAIL_COMERCIAL = 'comercial@dermia.tech';
const EMAIL_SUPORTE = 'suporte@dermia.tech';

type Icone = React.ComponentProps<typeof Ionicons>['name'];

const COMO_FUNCIONA: { icone: Icone; titulo: string; texto: string }[] = [
  {
    icone: 'camera-outline',
    titulo: 'Foto padronizada',
    texto: 'A equipe registra a lesão com enquadramento guiado, direto do celular ou do navegador.',
  },
  {
    icone: 'sparkles-outline',
    titulo: 'Análise assistida por IA',
    texto: 'O modelo sugere grau e indicadores; a validação clínica continua sempre com o profissional.',
  },
  {
    icone: 'trending-up-outline',
    titulo: 'Evolução e relatórios',
    texto: 'Comparação temporal das fotos, gráficos de cicatrização e relatórios em PDF para o convênio.',
  },
];

const PARA_QUEM: [Icone, string][] = [
  ['business-outline', 'A instituição assina e administra os acessos da equipe'],
  ['medkit-outline', 'Fisioterapeutas e médicos avaliam, prescrevem e documentam'],
  ['people-outline', 'O paciente acompanha pelo portal, no celular'],
];

const PLANOS: Plano[] = [
  {
    nome: 'Clínica',
    publico: 'Consultórios e clínicas de reabilitação',
    itens: [
      'Até 5 profissionais',
      'Pacientes ativos ilimitados',
      'Portal do Paciente incluso',
      'Relatórios e atestados em PDF',
      'Suporte por e-mail',
    ],
  },
  {
    nome: 'Hospital',
    publico: 'Unidades hospitalares e centros de queimados',
    destaque: true,
    itens: [
      'Múltiplas equipes e fisioterapeutas',
      'Painel de indicadores da unidade',
      'Onboarding assistido da equipe',
      'Exportação do histórico completo',
      'Suporte prioritário',
    ],
  },
  {
    nome: 'Rede / Grupo',
    publico: 'Redes de saúde e grupos com várias unidades',
    itens: [
      'Várias unidades em um contrato',
      'SSO e políticas de acesso',
      'SLA e ambiente dedicado',
      'Gerente de conta dedicado',
      'Integrações sob demanda',
    ],
  },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <Text className="text-primaria text-xs font-bold uppercase mb-2" style={{ letterSpacing: 1.2 }}>
      {children}
    </Text>
  );
}

function BotaoCTA({
  rotulo,
  onPress,
  variante = 'primario',
}: {
  rotulo: string;
  onPress: () => void;
  variante?: 'primario' | 'contorno';
}) {
  const { cores } = useTema();
  const primario = variante === 'primario';
  const t = useRef(new Animated.Value(0)).current;
  const animar = (para: number) =>
    Animated.timing(t, { toValue: para, duration: 150, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => animar(1)}
        onHoverOut={() => animar(0)}
        style={({ pressed }) => ({
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: primario ? 0 : 1,
          borderColor: cores.borda,
          backgroundColor: primario ? cores.primaria : cores.superficie,
          opacity: pressed ? 0.85 : 1,
        })}>
        <Text style={{ fontWeight: '600', color: primario ? '#FFFFFF' : cores.texto }}>{rotulo}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Landing() {
  const router = useRouter();
  const largo = useLargo();
  const { cores } = useTema();
  const scrollRef = useRef<ScrollView>(null);
  const planosY = useRef(0);

  // A landing é só para a web (é uma página de marketing) — nunca depende do
  // tamanho da tela, só da plataforma. No app nativo a raiz é sempre a tela de
  // login (que por sua vez já manda quem estiver logado para painel/portal);
  // sem checar sessão/perfil aqui, então não tem uma tela de landing "piscando"
  // antes do redirect.
  if (Platform.OS !== 'web') {
    return <Redirect href="/login" />;
  }

  function irParaPlanos() {
    scrollRef.current?.scrollTo({ y: Math.max(0, planosY.current - 24), animated: true });
  }

  function falarComVendas() {
    Linking.openURL(`mailto:${EMAIL_COMERCIAL}?subject=${encodeURIComponent('Interesse no DermIA')}`);
  }

  // Bloco de conteúdo: centralizado, largura máxima folgada para monitores e um
  // recuo lateral que respira. Todas as seções, o header e o rodapé usam.
  const bloco = {
    width: '100%' as const,
    maxWidth: LARGURA_CONTEUDO,
    alignSelf: 'center' as const,
    paddingHorizontal: largo ? RECUO_CONTEUDO : 20,
  };
  return (
    <View className="flex-1 bg-fundo">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <View style={{ position: 'sticky', top: 0, zIndex: 20 } as any}>
        <TopoSite onPlanos={irParaPlanos} />
      </View>

      <ScrollView ref={scrollRef} className="flex-1">
        {/* Hero */}
        <View className="w-full pt-24 pb-20" style={{ alignItems: 'center' }}>
          <View style={{ ...bloco, alignItems: 'center' }}>
            {/* halo suave da marca atrás do título */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -80,
                left: '50%',
                marginLeft: -260,
                width: 520,
                height: 520,
                borderRadius: 260,
                backgroundColor: cores.primaria,
                opacity: 0.06,
              }}
            />
            <AoAparecer delay={0}>
              <LogoDermia size={72} />
            </AoAparecer>
            <AoAparecer delay={80}>
              <Text
                className="text-texto font-bold mt-5 text-center"
                style={{ fontSize: largo ? 46 : 28, lineHeight: largo ? 54 : 36, maxWidth: 820 }}>
                Acompanhamento clínico de queimaduras com apoio de IA
              </Text>
            </AoAparecer>
            <AoAparecer delay={140}>
              <Text
                className="text-secundario text-base mt-4 text-center"
                style={{ maxWidth: 620 }}>
                Do registro da lesão à alta: fotos padronizadas, análise assistida, evolução
                documentada e um portal para o paciente acompanhar o tratamento.
              </Text>
            </AoAparecer>
            <AoAparecer
              delay={200}
              style={{
                marginTop: 32,
                gap: 12,
                flexDirection: largo ? 'row' : 'column',
                alignSelf: 'center',
              }}>
              <BotaoCTA rotulo="Falar com vendas" onPress={falarComVendas} />
              <BotaoCTA rotulo="Entrar" variante="contorno" onPress={() => router.push('/login')} />
            </AoAparecer>
          </View>
        </View>

        {/* Como funciona */}
        <View className="w-full bg-superficie border-y border-borda py-16" style={{ alignItems: 'center' }}>
          <View style={bloco}>
            <AoAparecer style={{ alignItems: 'center' }}>
              <Eyebrow>Como funciona</Eyebrow>
              <Text className="text-texto text-2xl font-bold mb-1 text-center">
                Três passos, do primeiro atendimento à alta
              </Text>
              <Text className="text-secundario mb-8 text-center">
                Rápido de adotar, fácil para a equipe.
              </Text>
            </AoAparecer>
            <View className={largo ? 'flex-row items-stretch gap-5' : 'gap-4'}>
              {COMO_FUNCIONA.map((c, i) => (
                <View key={c.titulo} className={largo ? 'flex-1' : 'w-full'}>
                  <CartaoHover delay={80 * (i + 1)} className="p-6">
                    <View
                      className="w-11 h-11 rounded-xl items-center justify-center mb-3"
                      style={{ backgroundColor: cores.primariaSuave }}>
                      <Ionicons name={c.icone} size={22} color={cores.primaria} />
                    </View>
                    <Text className="text-texto text-lg font-semibold mb-1">{c.titulo}</Text>
                    <Text className="text-secundario text-sm">{c.texto}</Text>
                  </CartaoHover>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Para clínicas e hospitais (B2B2C) */}
        <View className="w-full py-16" style={{ alignItems: 'center' }}>
          <View style={bloco}>
            <View className={largo ? 'flex-row items-center gap-10' : 'gap-8'}>
              <AoAparecer style={largo ? { flex: 1 } : undefined}>
                <Eyebrow>Modelo B2B2C</Eyebrow>
                <Text className="text-texto text-2xl font-bold mb-3">
                  Feito para clínicas e hospitais
                </Text>
                <Text className="text-secundario text-base">
                  A instituição contrata o DermIA, a equipe clínica usa no dia a dia e o paciente
                  acompanha o próprio tratamento pelo Portal do Paciente — exercícios, lembretes e
                  evolução, sem exposição das fotos clínicas.
                </Text>
              </AoAparecer>
              <View className={largo ? 'flex-1 gap-3' : 'gap-3'}>
                {PARA_QUEM.map(([icone, texto]) => (
                  <View
                    key={texto}
                    className="flex-row items-center gap-3 rounded-xl border border-borda bg-superficie p-4">
                    <Ionicons name={icone} size={20} color={cores.primaria} />
                    <Text className="text-texto text-sm flex-1">{texto}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Planos */}
        <View
          className="w-full bg-superficie border-y border-borda py-16"
          style={{ alignItems: 'center' }}
          onLayout={(e) => {
            planosY.current = e.nativeEvent.layout.y;
          }}>
          <View style={bloco}>
            <AoAparecer style={{ alignItems: 'center' }}>
              <Eyebrow>Planos</Eyebrow>
              <Text className="text-texto text-2xl font-bold mb-1 text-center">
                Assinatura anual por instituição
              </Text>
              <Text className="text-secundario mb-8 text-center">
                Fale com o comercial para um orçamento conforme o porte da sua operação.
              </Text>
            </AoAparecer>
            <View className={largo ? 'flex-row items-stretch gap-6' : 'gap-5'}>
              {PLANOS.map((p, i) => (
                <View key={p.nome} className={largo ? 'flex-1' : 'w-full'}>
                  <CartaoPlano plano={p} delay={90 * (i + 1)} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Contato */}
        <View className="w-full py-20" style={{ alignItems: 'center' }}>
          <View style={bloco}>
            <AoAparecer style={{ alignItems: 'center' }}>
              <Eyebrow>Contato</Eyebrow>
              <Text className="text-texto text-2xl font-bold text-center">Vamos conversar</Text>
              <Text className="text-secundario mt-2 text-center" style={{ maxWidth: 560 }}>
                Conte sobre a sua clínica ou hospital e montamos uma proposta e um piloto
                acompanhado.
              </Text>
              <View className="mt-6">
                <BotaoCTA rotulo="Falar com vendas" onPress={falarComVendas} />
              </View>
              <Pressable onPress={() => router.push('/login')} style={{ marginTop: 16 }}>
                <Text className="text-primaria font-medium">Já tem conta? Entrar</Text>
              </Pressable>
            </AoAparecer>
          </View>
        </View>

        {/* Rodapé */}
        <View className="w-full border-t border-borda bg-superficie" style={{ alignItems: 'center' }}>
          <View
            className="py-6 flex-row items-center justify-between flex-wrap gap-3"
            style={bloco}>
            <View className="flex-row items-center gap-2">
              <LogoDermia size={18} />
              <Text className="text-secundario text-xs">
                DermIA · acompanhamento clínico de queimaduras
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => Linking.openURL(`mailto:${EMAIL_SUPORTE}`)}>
                <Text className="text-secundario text-xs">Suporte</Text>
              </Pressable>
              <Text className="text-secundario text-xs">© {new Date().getFullYear()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
