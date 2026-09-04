import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import Protegido from '@/components/Protegido';
import { palette } from '@/constants/Colors';
import { avisar } from '@/.lib/aviso';
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

function confirmar(mensagem: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(mensagem));
  }
  return new Promise((resolve) => {
    Alert.alert('Confirmar', mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

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

type PapelCriavel = 'fisioterapeuta' | 'estagiario' | 'admin' | 'admin_geral';

const PAPEIS: [PapelCriavel, string][] = [
  ['fisioterapeuta', 'Fisioterapeuta'],
  ['estagiario', 'Estagiário'],
  ['admin', 'Admin da clínica'],
  ['admin_geral', 'Admin geral (plataforma)'],
];

// Cadastro de um usuário em qualquer nível — inclusive outro admin_geral (só o
// admin_geral chega aqui). Gera a senha temporária do primeiro acesso — o novo
// usuário troca depois em Ajustes.
function CriarUsuarioPlataforma({
  clinicas,
  aoCriar,
}: {
  clinicas: Clinica[];
  aoCriar: () => void;
}) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<PapelCriavel>('admin');
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<{ email: string; senha: string; papel: string } | null>(
    null
  );

  async function criar() {
    setErro(null);
    setCriado(null);
    if (nome.trim().length < 2) return setErro('Informe o nome completo.');
    if (!RE_EMAIL.test(email.trim())) return setErro('Informe um e-mail válido.');
    if (papel !== 'admin_geral' && !clinicaId) return setErro('Escolha a clínica.');
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke('criar-fisioterapeuta', {
      body: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        papel,
        clinica_id: papel === 'admin_geral' ? null : clinicaId,
      },
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    setCriado({ email: data.email, senha: data.senha_temporaria, papel: data.papel ?? papel });
    setNome('');
    setEmail('');
    setPapel('admin');
    setClinicaId(null);
    aoCriar();
  }

  const campo = 'bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto';

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-6">
      <Text className="text-texto font-semibold mb-2">Cadastrar usuário da plataforma</Text>

      <Text className="text-secundario text-xs font-semibold uppercase mb-1">Nível de permissão</Text>
      <View className="flex-row flex-wrap gap-1 mb-3">
        {PAPEIS.map(([valor, rotulo]) => {
          const on = papel === valor;
          return (
            <Pressable
              key={valor}
              onPress={() => setPapel(valor)}
              className={`rounded-lg px-3 py-2 ${on ? 'bg-primaria' : 'bg-fundo border border-borda'}`}>
              <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-secundario'}`}>
                {rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      {papel === 'admin_geral' ? (
        <Text className="text-secundario text-xs mb-2">
          Admin geral é um papel de plataforma — não precisa estar vinculado a nenhuma clínica.
        </Text>
      ) : (
        <>
          <Text className="text-secundario text-xs font-semibold uppercase mb-1">Clínica</Text>
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
        </>
      )}
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
            Repasse ao novo usuário ({criado.papel}). Ele troca a senha depois em Ajustes › Segurança.
          </Text>
          <Text selectable className="text-texto text-xs">E-mail: {criado.email}</Text>
          <Text selectable className="text-texto text-xs">Senha temporária: {criado.senha}</Text>
        </View>
      )}
    </View>
  );
}

// Cadastro de clínica nova. Só manda `nome` — é o único campo que sabemos que
// existe de verdade neste banco (ver dermia_schema_source_of_truth); se a
// tabela exigir mais alguma coluna NOT NULL, o Postgrest recusa e mostra o
// erro dele direto na tela, em vez de a gente adivinhar campos que talvez nem
// existam.
function CriarClinica({ aoCriar }: { aoCriar: () => void }) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Informe o nome da clínica.');
    setSalvando(true);
    const { error } = await supabase.from('clinicas').insert({ nome: nome.trim() });
    setSalvando(false);
    if (error) return setErro(error.message);
    setNome('');
    aoCriar();
  }

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-6">
      <Text className="text-texto font-semibold mb-2">Cadastrar clínica</Text>
      <View className="flex-row gap-2">
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Nome da clínica"
          placeholderTextColor={cores.secundario}
          className="flex-1 bg-fundo border border-borda rounded-xl px-4 py-3 text-texto"
        />
        <Pressable
          onPress={criar}
          disabled={salvando}
          className="bg-primaria rounded-xl px-5 items-center justify-center">
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">Criar</Text>
          )}
        </Pressable>
      </View>
      {erro && <Text className="text-risco text-xs mt-2">{erro}</Text>}
    </View>
  );
}

// Nome da clínica em modo edição inline (clique pra abrir, salva ou cancela).
function NomeClinicaEditavel({
  clinicaId,
  nome,
  aoSalvar,
}: {
  clinicaId: string;
  nome: string;
  aoSalvar: () => void;
}) {
  const { cores } = useTema();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (valor.trim().length < 2) return setErro('Nome muito curto.');
    setErro(null);
    setSalvando(true);
    const { error } = await supabase
      .from('clinicas')
      .update({ nome: valor.trim() })
      .eq('id', clinicaId);
    setSalvando(false);
    if (error) return setErro(error.message);
    setEditando(false);
    aoSalvar();
  }

  async function excluir() {
    const ok = await confirmar(
      `Excluir a clínica "${nome}" de vez? Só funciona se não houver profissionais ou pacientes vinculados a ela.`
    );
    if (!ok) return;
    const { error } = await supabase.from('clinicas').delete().eq('id', clinicaId);
    if (error) {
      avisar(
        error.message.toLowerCase().includes('foreign key')
          ? 'Essa clínica ainda tem profissionais ou pacientes vinculados — remova-os primeiro.'
          : error.message
      );
      return;
    }
    aoSalvar();
  }

  if (editando) {
    return (
      <View className="flex-1 flex-row items-center gap-2">
        <TextInput
          value={valor}
          onChangeText={setValor}
          autoFocus
          placeholderTextColor={cores.secundario}
          className="flex-1 bg-fundo border border-borda rounded-lg px-3 py-1.5 text-texto"
        />
        <Pressable onPress={salvar} disabled={salvando} className="px-2 py-1">
          {salvando ? (
            <ActivityIndicator color={cores.primaria} size="small" />
          ) : (
            <Text className="text-primaria text-xs font-semibold">Salvar</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            setValor(nome);
            setErro(null);
            setEditando(false);
          }}
          className="px-2 py-1">
          <Text className="text-secundario text-xs font-semibold">Cancelar</Text>
        </Pressable>
        {erro && <Text className="text-risco text-xs">{erro}</Text>}
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <Text className="text-texto font-semibold">{nome}</Text>
      <Pressable onPress={() => setEditando(true)}>
        <Text className="text-primaria text-xs font-semibold">Editar</Text>
      </Pressable>
      <Pressable onPress={excluir}>
        <Text className="text-risco text-xs font-semibold">Excluir</Text>
      </Pressable>
    </View>
  );
}

// Uma linha de profissional com edição de papel/ativo e exclusão. Some com o
// botão "Salvar" enquanto não houver mudança, pra não distrair.
function LinhaProfissional({ membro, aoMudar }: { membro: Prof; aoMudar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [papel, setPapel] = useState<PapelCriavel>(membro.papel as PapelCriavel);
  const [ativo, setAtivo] = useState(membro.ativo);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudou = papel !== membro.papel || ativo !== membro.ativo;

  async function salvar() {
    setErro(null);
    setSalvando(true);
    const { error } = await supabase
      .from('profissionais')
      .update({ papel, ativo })
      .eq('id', membro.id);
    setSalvando(false);
    if (error) return setErro(error.message);
    setEditando(false);
    aoMudar();
  }

  async function excluir() {
    const ok = await confirmar(
      `Excluir "${membro.nome}" de vez? Se essa pessoa já tiver pacientes, lesões ou registros vinculados, a exclusão é recusada — desative em vez de excluir nesse caso.`
    );
    if (!ok) return;
    setExcluindo(true);
    const { error } = await supabase.functions.invoke('excluir-profissional', {
      body: { profissional_id: membro.id },
    });
    setExcluindo(false);
    if (error) {
      avisar(error.message);
      return;
    }
    aoMudar();
  }

  return (
    <View className="border-t border-borda py-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-texto text-sm flex-1 pr-2">{membro.nome}</Text>
        {!editando ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-secundario text-xs">
              {membro.papel}
              {membro.email ? ` · ${membro.email}` : ''}
              {membro.ativo ? '' : ' · inativo'}
            </Text>
            <Pressable onPress={() => setEditando(true)}>
              <Text className="text-primaria text-xs font-semibold">Editar</Text>
            </Pressable>
            <Pressable onPress={excluir} disabled={excluindo}>
              {excluindo ? (
                <ActivityIndicator size="small" color={palette.risco} />
              ) : (
                <Text className="text-risco text-xs font-semibold">Excluir</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setPapel(membro.papel as PapelCriavel);
              setAtivo(membro.ativo);
              setErro(null);
              setEditando(false);
            }}>
            <Text className="text-secundario text-xs font-semibold">Cancelar</Text>
          </Pressable>
        )}
      </View>

      {editando && (
        <View className="mt-2">
          <View className="flex-row flex-wrap gap-1 mb-2">
            {PAPEIS.map(([valor, rotulo]) => {
              const on = papel === valor;
              return (
                <Pressable
                  key={valor}
                  onPress={() => setPapel(valor)}
                  className={`rounded-lg px-2.5 py-1.5 ${on ? 'bg-primaria' : 'bg-fundo border border-borda'}`}>
                  <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-secundario'}`}>
                    {rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setAtivo((a) => !a)}
            className={`self-start rounded-lg px-2.5 py-1.5 mb-2 ${ativo ? 'bg-ok/20 border border-ok' : 'bg-fundo border border-borda'}`}>
            <Text className={`text-xs font-semibold ${ativo ? 'text-ok' : 'text-secundario'}`}>
              {ativo ? 'Ativo' : 'Inativo'} — toque pra alternar
            </Text>
          </Pressable>
          {erro && <Text className="text-risco text-xs mb-2">{erro}</Text>}
          <Pressable
            onPress={salvar}
            disabled={!mudou || salvando}
            className={`self-start rounded-lg px-3 py-1.5 ${mudou ? 'bg-primaria' : 'bg-fundo border border-borda'}`}>
            {salvando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className={`text-xs font-semibold ${mudou ? 'text-white' : 'text-secundario'}`}>
                Salvar
              </Text>
            )}
          </Pressable>
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
      { nome: string; equipe: Prof[]; pacientes: number; real: boolean }
    >();
    for (const c of clinicas) mapa.set(c.id, { nome: c.nome, equipe: [], pacientes: 0, real: true });

    const avulsa = (id: string | null) => {
      const chave = id ?? 'sem-clinica';
      if (!mapa.has(chave))
        mapa.set(chave, { nome: 'Sem clínica', equipe: [], pacientes: 0, real: false });
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

      <CriarClinica aoCriar={carregar} />

      <CriarUsuarioPlataforma clinicas={clinicas} aoCriar={carregar} />

      {porClinica.map((c) => (
        <View key={c.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            {c.real ? (
              <NomeClinicaEditavel clinicaId={c.id} nome={c.nome} aoSalvar={carregar} />
            ) : (
              <Text className="text-texto font-semibold">{c.nome}</Text>
            )}
            <Text className="text-secundario text-xs">
              {c.equipe.length} da equipe · {c.pacientes} paciente(s)
            </Text>
          </View>
          {c.equipe.length === 0 ? (
            <Text className="text-secundario text-xs">Nenhum profissional cadastrado.</Text>
          ) : (
            c.equipe.map((m) => <LinhaProfissional key={m.id} membro={m} aoMudar={carregar} />)
          )}
        </View>
      ))}
    </ScrollView>
  );
}
