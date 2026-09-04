import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import AlterarSenha from '@/components/ui/AlterarSenha';
import { ehAdmin, usePerfilAtual } from '@/.lib/acesso';
import { supabase } from '@/.lib/supabase';
import { useTema, type PreferenciaTema } from '@/.lib/tema';

const ROTULO_PAPEL: Record<string, string> = {
  admin_geral: 'Admin geral (plataforma)',
  admin: 'Administrador',
  fisioterapeuta: 'Fisioterapeuta',
  estagiario: 'Estagiário',
};

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { valor: 'light', rotulo: 'Claro', icone: 'sunny-outline' },
  { valor: 'dark', rotulo: 'Escuro', icone: 'moon-outline' },
  { valor: 'system', rotulo: 'Sistema', icone: 'contrast-outline' },
];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-secundario text-xs font-semibold uppercase tracking-wide mb-2 px-1">
        {titulo}
      </Text>
      <View className="bg-superficie border border-borda rounded-2xl overflow-hidden">{children}</View>
    </View>
  );
}

export default function TelaAjustes() {
  const { preferencia, cores, escolher } = useTema();
  const { perfil } = usePerfilAtual();
  const versao = Constants.expoConfig?.version ?? '1.0.0';
  const canal = Updates.channel ?? 'desenvolvimento';

  return (
    <ScrollView
      className="flex-1 bg-fundo"
      contentContainerClassName="w-full max-w-3xl self-center p-4">
      <Text className="text-texto text-2xl font-bold mb-6">Ajustes</Text>

      {perfil && (
        <Secao titulo="Conta">
          <View className="p-4 gap-1">
            <Text className="text-texto font-semibold">{perfil.nome}</Text>
            <Text className="text-secundario text-sm">{perfil.email ?? '—'}</Text>
            <Text className="text-primaria text-xs font-semibold mt-1">
              {ROTULO_PAPEL[perfil.papel] ?? perfil.papel}
            </Text>
          </View>
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className="border-t border-borda px-4 py-3">
            <Text className="text-risco font-semibold">Sair da conta</Text>
          </Pressable>
        </Secao>
      )}

      <Secao titulo="Segurança">
        <AlterarSenha />
      </Secao>

      {ehAdmin(perfil) && (
        <Secao titulo="Administração">
          <Link href="/admin" asChild>
            <Pressable className="flex-row items-center justify-between px-4 py-3.5">
              <View className="flex-row items-center gap-3">
                <Ionicons name="shield-checkmark-outline" size={20} color={cores.primaria} />
                <Text className="text-texto font-semibold">Painel de Admin</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={cores.secundario} />
            </Pressable>
          </Link>
        </Secao>
      )}

      <Secao titulo="Aparência">
        <View className="flex-row p-2 gap-2">
          {OPCOES.map((op) => {
            const ativo = preferencia === op.valor;
            return (
              <Pressable
                key={op.valor}
                onPress={() => escolher(op.valor)}
                className={`flex-1 items-center rounded-xl py-3 ${
                  ativo ? 'bg-primaria-suave' : 'bg-fundo'
                }`}>
                <Ionicons
                  name={op.icone}
                  size={22}
                  color={ativo ? cores.primaria : cores.secundario}
                />
                <Text
                  className={`mt-1 text-sm font-semibold ${
                    ativo ? 'text-primaria' : 'text-secundario'
                  }`}>
                  {op.rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Secao>

      <Secao titulo="Inteligência artificial">
        <View className="p-4">
          <Text className="text-texto font-semibold mb-1">Validação manual</Text>
          <Text className="text-secundario text-sm leading-5">
            A sugestão automática de grau roda num servidor de IA à parte e entra numa
            fase seguinte. Por enquanto, cada análise é validada manualmente
            (Aceitar / Editar / Rejeitar).
          </Text>
        </View>
      </Secao>

      <Secao titulo="Sobre">
        <View className="p-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-secundario">Versão</Text>
            <Text className="text-texto font-semibold">{versao}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-secundario">Canal de atualização</Text>
            <Text className="text-texto font-semibold">{canal}</Text>
          </View>
        </View>
      </Secao>

      <Link href="/nav" className="text-primaria font-semibold px-1 py-2">
        Página de navegação (dev)
      </Link>
    </ScrollView>
  );
}
