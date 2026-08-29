import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import SeletorCatalogo from '@/components/ui/SeletorCatalogo';
import { avisar } from '@/.lib/aviso';
import { useTema } from '@/.lib/tema';
import {
  criarMedicamentoCatalogo,
  listarCatalogoMedicamentos,
  type MedicamentoCatalogo,
} from '@/.lib/medicamentos';
import { criarPrescricao } from '@/.lib/prescricoes';

const campo = 'bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto';

export default function NovaPrescricao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [catalogoId, setCatalogoId] = useState<string | null>(null);
  const [dose, setDose] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [catalogo, setCatalogo] = useState<MedicamentoCatalogo[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    listarCatalogoMedicamentos(busca).then(setCatalogo);
  }, [busca]);

  function selecionarDoCatalogo(item: MedicamentoCatalogo) {
    setNome(item.nome);
    setCatalogoId(item.id);
    if (item.dose_padrao) setDose(item.dose_padrao);
    if (item.frequencia_padrao) setFrequencia(item.frequencia_padrao);
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro('Escolha um remédio/curativo do catálogo ou cadastre um novo.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { error } = await criarPrescricao({
      paciente_id: id,
      nome: nome.trim(),
      dose: dose.trim() || null,
      frequencia: frequencia.trim() || null,
      inicio: inicio.trim() || null,
      fim: fim.trim() || null,
      observacoes: observacoes.trim() || null,
      catalogo_id: catalogoId,
    });
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    avisar('Prescrição adicionada.');
    router.back();
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />

      <Text className="text-secundario text-xs font-semibold mb-1">REMÉDIO / CURATIVO</Text>
      <View className="mb-3">
        <SeletorCatalogo<MedicamentoCatalogo>
          itens={catalogo}
          keyItem={(m) => m.id}
          rotuloItem={(m) => m.nome}
          descricaoItem={(m) =>
            [m.apresentacao, m.via, m.dose_padrao].filter(Boolean).join(' · ') || null
          }
          idSelecionado={catalogoId}
          busca={busca}
          onBusca={setBusca}
          onSelecionar={selecionarDoCatalogo}
          renderFormNovo={(fechar) => (
            <FormNovoMedicamento
              onCriado={(item) => {
                setCatalogo((atual) => [item, ...atual]);
                selecionarDoCatalogo(item);
                fechar();
              }}
            />
          )}
        />
        {nome ? (
          <Text className="text-secundario text-xs mt-1">Selecionado: {nome}</Text>
        ) : null}
      </View>

      <TextInput
        value={dose}
        onChangeText={setDose}
        placeholder="Dose (ex.: camada fina)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={frequencia}
        onChangeText={setFrequencia}
        placeholder="Frequência (ex.: 2x ao dia)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <Text className="text-secundario text-xs font-semibold mb-1">INÍCIO (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={inicio} onChange={setInicio} placeholder="Escolher data" opcional />
      </View>
      <Text className="text-secundario text-xs font-semibold mb-1">FIM (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={fim} onChange={setFim} placeholder="Em uso / sem previsão" opcional />
      </View>
      <TextInput
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Observações (opcional)"
        placeholderTextColor={cores.secundario}
        multiline
        className={`${campo} min-h-[80px]`}
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3.5 items-center">
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Prescrever</Text>
        )}
      </Pressable>

      <Text className="text-secundario text-xs mt-3 text-center">
        O PDF da prescrição e o envio por e-mail ficam na tela do paciente, em
        “Remédios e curativos”.
      </Text>
    </ScrollView>
  );
}

function FormNovoMedicamento({ onCriado }: { onCriado: (item: MedicamentoCatalogo) => void }) {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [apresentacao, setApresentacao] = useState('');
  const [via, setVia] = useState('');
  const [dosePadrao, setDosePadrao] = useState('');
  const [frequenciaPadrao, setFrequenciaPadrao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { item, error } = await criarMedicamentoCatalogo({
      nome: nome.trim(),
      apresentacao: apresentacao.trim() || null,
      via: via.trim() || null,
      dose_padrao: dosePadrao.trim() || null,
      frequencia_padrao: frequenciaPadrao.trim() || null,
    });
    setSalvando(false);
    if (error || !item) {
      setErro(error ?? 'Falha ao cadastrar.');
      return;
    }
    onCriado(item);
  }

  return (
    <View>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome (ex.: Sulfadiazina de prata 1%)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={apresentacao}
        onChangeText={setApresentacao}
        placeholder="Apresentação (ex.: creme 1%, comprimido 500 mg)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={via}
        onChangeText={setVia}
        placeholder="Via (ex.: tópica, oral, curativo)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={dosePadrao}
        onChangeText={setDosePadrao}
        placeholder="Dose padrão (opcional)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={frequenciaPadrao}
        onChangeText={setFrequenciaPadrao}
        placeholder="Frequência padrão (opcional)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      {erro && <Text className="text-risco mb-3">{erro}</Text>}
      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3 items-center">
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Salvar no catálogo</Text>
        )}
      </Pressable>
    </View>
  );
}
