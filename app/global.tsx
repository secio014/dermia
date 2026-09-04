import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import Protegido from '@/components/Protegido';
import { palette } from '@/constants/Colors';
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Visão da plataforma (nossa empresa): todas as clínicas, todos os usuários e os
// números somados. Só o papel `admin_geral` chega aqui — e o RLS cross-clínica
// (supabase/scripts/rls-admin-geral.sql) é o que faz as queries abaixo
// enxergarem além da própria clínica.

type Clinica = { id: string; nome: string };
type Prof = { id: string; nome: string; papel: string; email: string | null; ativo: boolean; clinica_id: string | null };
type Pac = { id: string; clinica_id: string | null; ativo: boolean | null };

function nomeClinica(c: Record<string, unknown>): string {
  return (
    (c.nome as string) ||
    (c.razao_social as string) ||
    (c.nome_fantasia as string) ||
    (c.id as string)
  );
}

function CartaoNumero({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 flex-1">
      <Text className="text-secundario text-xs mb-1">{titulo}</Text>
      <Text className="text-texto text-2xl font-bold">{valor}</Text>
    </View>
  );
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cadastro de um admin para qualquer clínica (só o admin_geral chega aqui). Gera
// a senha temporária do primeiro acesso — o novo admin troca depois em Ajustes.
function CriarAdminClinica({
  clinicas,
  aoCriar,
}: {
  clinicas: Clinica[];
  aoCriar: () => void;
}) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(null);

  async function criar() {
    setErro(null);
    setCriado(null);
    if (nome.trim().length < 2) return setErro('Informe o nome completo.');
    if (!RE_EMAIL.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (!clinicaId) return setErro('Escolha a clínica.');
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke('criar-fisioterapeuta', {
      body: { nome: nome.trim(), email: email.trim().toLowerCase(), papel: 'admin', clinica_id: clinicaId },
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    setCriado({ email: data.email, senha: data.senha_temporaria });
    setNome('');
    setEmail('');
    setClinicaId(null);
    aoCriar();
  }

  const campo = 'bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto';

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-6">
      <Text className="text-texto font-semibold mb-2">Cadastrar admin de clínica</Text>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor={cores.secundario}
        autoCapitalize="none"
        keyboardType="email-address"
        className={campo}
      />
      <View className="flex-row flex-wrap gap-1 mb-2">
        {clinicas.map((c) => {
          const on = clinicaId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setClinicaId(c.id)}
              className={`rounded-lg px-3 py-2 ${on ? 'bg-primaria' : 'bg-fundo border border-borda'}`}>
              <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-secundario'}`}>
                {c.nome}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {erro && <Text className="text-risco text-xs mb-2">{erro}</Text>}
      <Pressable
        onPress={criar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3 items-center">
        {salvando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-semibold">Criar acesso</Text>
        )}
      </Pressable>
      {criado && (
        <View className="border border-ok rounded-xl p-3 mt-3">
          <Text className="text-texto font-semibold mb-1">Acesso criado!</Text>
          <Text className="text-secundario text-xs mb-1">
            Repasse ao novo admin. Ele troca a senha depois em Ajustes › Segurança.
          </Text>
          <Text selectable className="text-texto text-xs">E-mail: {criado.email}</Text>
          <Text selectable className="text-texto text-xs">Senha temporária: {criado.senha}</Text>
        </View>
      )}
    </View>
  );
}

export default function TelaGlobal() {
  return (
    <Protegido permissao="painel_global">
      <PainelGlobal />
    </Protegido>
  );
}

function PainelGlobal() {
  const largo = useLargo();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [profissionais, setProfissionais] = useState<Prof[]>([]);
  const [pacientes, setPacientes] = useState<Pac[]>([]);

  const carregar = useCallback(async () => {
    setErro(null);
    const [{ data: cli, error: eCli }, { data: prof, error: eProf }, { data: pac, error: ePac }] =
      await Promise.all([
        // Sem .order() aqui: não sabemos o nome exato da coluna de nome em
        // `clinicas` neste banco — ordenamos no cliente pelo rótulo resolvido.
        supabase.from('clinicas').select('*'),
        supabase
          .from('profissionais')
          .select('id, nome, papel, email, ativo, clinica_id')
          .order('nome', { ascending: true }),
        supabase.from('pacientes').select('id, clinica_id, ativo'),
      ]);

    const primeiroErro = eCli || eProf || ePac;
    if (primeiroErro) setErro(primeiroErro.message);

    setClinicas(
      ((cli as Record<string, unknown>[]) ?? [])
        .map((c) => ({ id: c.id as string, nome: nomeClinica(c) }))
        .sort((a, b) => a.nome.localeCompare(b.nome))
    );
    setProfissionais((prof as Prof[]) ?? []);
    setPacientes((pac as Pac[]) ?? []);
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const porClinica = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; equipe: Prof[]; pacientes: number }
    >();
    for (const c of clinicas) mapa.set(c.id, { nome: c.nome, equipe: [], pacientes: 0 });

    const avulsa = (id: string | null) => {
      const chave = id ?? 'sem-clinica';
      if (!mapa.has(chave)) mapa.set(chave, { nome: 'Sem clínica', equipe: [], pacientes: 0 });
      return mapa.get(chave)!;
    };

    for (const p of profissionais) avulsa(p.clinica_id).equipe.push(p);
    for (const p of pacientes) avulsa(p.clinica_id).pacientes += 1;

    return Array.from(mapa.entries()).map(([id, v]) => ({ id, ...v }));
  }, [clinicas, profissionais, pacientes]);

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-5xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-texto text-xl font-bold mb-1">Visão global</Text>
      <Text className="text-secundario mb-4">
        Todas as clínicas e usuários da plataforma. Use o "Ver como" no menu para pré-visualizar o
        app na visão de cada papel.
      </Text>

      {erro && (
        <View className="border border-risco rounded-xl p-3 mb-4">
          <Text className="text-risco text-xs">
            Algumas informações podem estar limitadas à sua clínica: {erro}. Confirme que
            supabase/scripts/rls-admin-geral.sql foi aplicado.
          </Text>
        </View>
      )}

      <View className={largo ? 'flex-row gap-3 mb-6' : 'gap-3 mb-6'}>
        <CartaoNumero titulo="Clínicas" valor={clinicas.length} />
        <CartaoNumero titulo="Profissionais" valor={profissionais.length} />
        <CartaoNumero titulo="Pacientes" valor={pacientes.length} />
      </View>

      {clinicas.length > 0 && <CriarAdminClinica clinicas={clinicas} aoCriar={carregar} />}

      {porClinica.map((c) => (
        <View key={c.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-texto font-semibold">{c.nome}</Text>
            <Text className="text-secundario text-xs">
              {c.equipe.length} da equipe · {c.pacientes} paciente(s)
            </Text>
          </View>
          {c.equipe.length === 0 ? (
            <Text className="text-secundario text-xs">Nenhum profissional cadastrado.</Text>
          ) : (
            c.equipe.map((m) => (
              <View
                key={m.id}
                className="flex-row items-center justify-between border-t border-borda py-2">
                <Text className="text-texto text-sm flex-1 pr-2">{m.nome}</Text>
                <Text className="text-secundario text-xs">
                  {m.papel}
                  {m.email ? ` · ${m.email}` : ''}
                  {m.ativo ? '' : ' · inativo'}
                </Text>
              </View>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}
