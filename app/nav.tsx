import { useEffect, useState } from 'react';
import { Link, Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

// Página de navegação sem estilo — lista todas as rotas do app para
// inspecionar e transitar rápido durante o desenvolvimento. Rota: /nav

type Ids = { pacienteId: string | null; lesaoId: string | null; analiseId: string | null };

const ROTAS_FIXAS: [string, string][] = [
  ['Landing / site', '/'],
  ['Home (painel)', '/painel'],
  ['Agenda', '/agenda'],
  ['Ajustes', '/ajustes'],
  ['Admin', '/admin'],
  ['Nova consulta', '/consulta/nova'],
  ['Novo paciente', '/paciente/novo'],
  ['Portal do paciente', '/portal'],
  ['Login (único)', '/login'],
  ['Página não encontrada (404)', '/rota-que-nao-existe'],
];

function Item({ titulo, href }: { titulo: string; href: string }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={href as any} style={{ paddingVertical: 10, fontSize: 16 }}>
      <Text>
        {titulo} <Text style={{ color: '#888' }}>— {href}</Text>
      </Text>
    </Link>
  );
}

export default function Navegacao() {
  const [ids, setIds] = useState<Ids>({ pacienteId: null, lesaoId: null, analiseId: null });

  useEffect(() => {
    (async () => {
      const { data: pac } = await supabase.from('pacientes').select('id').limit(1).maybeSingle();
      const pacienteId = pac?.id ?? null;
      let lesaoId: string | null = null;
      let analiseId: string | null = null;
      if (pacienteId) {
        const { data: les } = await supabase
          .from('lesoes')
          .select('id')
          .eq('paciente_id', pacienteId)
          .limit(1)
          .maybeSingle();
        lesaoId = les?.id ?? null;
        if (lesaoId) {
          const { data: an } = await supabase
            .from('analises_ia')
            .select('id')
            .eq('lesao_id', lesaoId)
            .limit(1)
            .maybeSingle();
          analiseId = an?.id ?? null;
        }
      }
      setIds({ pacienteId, lesaoId, analiseId });
    })();
  }, []);

  const p = ids.pacienteId;
  const l = ids.lesaoId;
  const a = ids.analiseId;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Stack.Screen options={{ headerTitle: 'Navegação' }} />
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Navegação (dev)</Text>

      <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 4 }}>Fixas</Text>
      {ROTAS_FIXAS.map(([titulo, href]) => (
        <Item key={href} titulo={titulo} href={href} />
      ))}

      <Text style={{ fontWeight: 'bold', marginTop: 20, marginBottom: 4 }}>
        Paciente {p ? `(${p})` : '(nenhum paciente no banco)'}
      </Text>
      {p ? (
        <>
          <Item titulo="Detalhe do paciente" href={`/paciente/${p}`} />
          <Item titulo="Relatório do paciente" href={`/paciente/${p}/relatorio`} />
          <Item titulo="Prescrever remédio" href={`/paciente/${p}/prescricao/nova`} />
          <Item titulo="Prescrever exercício" href={`/paciente/${p}/exercicio/novo`} />
          <Item titulo="Atestado médico" href={`/paciente/${p}/atestado/novo`} />
          <Item titulo="Nova lesão" href={`/paciente/${p}/lesao/novo`} />
        </>
      ) : null}

      <Text style={{ fontWeight: 'bold', marginTop: 20, marginBottom: 4 }}>
        Lesão {l ? `(${l})` : '(nenhuma lesão no banco)'}
      </Text>
      {p && l ? (
        <>
          <Item titulo="Evolução da lesão" href={`/paciente/${p}/lesao/${l}`} />
          <Item titulo="Comparar fotos" href={`/paciente/${p}/lesao/${l}/comparar`} />
          <Item titulo="Novo registro" href={`/paciente/${p}/lesao/${l}/registro/novo`} />
          <Item titulo="Nova foto" href={`/paciente/${p}/lesao/${l}/foto/nova`} />
          {a ? (
            <Item titulo="Foto da lesão" href={`/paciente/${p}/lesao/${l}/foto/${a}`} />
          ) : (
            <Text style={{ color: '#888', paddingVertical: 10 }}>
              Foto da lesão — nenhuma análise/foto no banco
            </Text>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
