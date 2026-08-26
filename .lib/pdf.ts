import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { GRAUS_CLINICOS } from '@/.lib/scq';

export type LesaoRelatorio = {
  id: string;
  regiao_corporal: string;
  scq_percentual: number | null;
  grau_clinico: string | null;
  data_ocorrencia: string | null;
  status: string;
};

export type RegistroRelatorio = {
  lesao_id: string;
  data_atendimento: string;
  descricao: string | null;
  condutas: string | null;
  dor_eva: number | null;
  adm: { articulacao: string; movimento: string; grau_ativo: number; grau_passivo: number }[];
};

export type FotoRelatorio = { lesao_id: string; criado_em: string; url: string };

function rotuloGrau(grau: string | null): string {
  return GRAUS_CLINICOS.find((g) => g.id === grau)?.rotulo ?? '—';
}

function formatarData(data: string | null): string {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '—';
}

export function montarHtmlRelatorio({
  tipo,
  nomePaciente,
  codigoPaciente,
  lesoes,
  registros,
  fotos,
}: {
  tipo: 'evolucao' | 'alta';
  nomePaciente: string;
  codigoPaciente: string;
  lesoes: LesaoRelatorio[];
  registros: RegistroRelatorio[];
  fotos: FotoRelatorio[];
}): string {
  const titulo = tipo === 'alta' ? 'Relatório de Alta' : 'Relatório de Evolução';

  const blocosLesoes = lesoes
    .map((lesao) => {
      const registrosDaLesao = registros
        .filter((r) => r.lesao_id === lesao.id)
        .sort((a, b) => a.data_atendimento.localeCompare(b.data_atendimento));
      const fotosDaLesao = fotos.filter((f) => f.lesao_id === lesao.id);

      const linhasRegistros = registrosDaLesao
        .map(
          (r) => `
        <tr>
          <td>${formatarData(r.data_atendimento)}</td>
          <td>${r.descricao ?? ''}</td>
          <td>${r.condutas ?? ''}</td>
          <td>${r.dor_eva ?? '—'}</td>
          <td>${r.adm
            .map((a) => `${a.articulacao}/${a.movimento}: ${a.grau_ativo}°/${a.grau_passivo}°`)
            .join('; ')}</td>
        </tr>`
        )
        .join('');

      const galeriaFotos = fotosDaLesao
        .map((f) => `<img src="${f.url}" style="width:120px;height:120px;object-fit:cover;border-radius:8px;margin:4px" />`)
        .join('');

      return `
        <div class="lesao">
          <h3>${lesao.regiao_corporal} — ${formatarData(lesao.data_ocorrencia)}</h3>
          <p>SCQ: ${lesao.scq_percentual ?? 0}% · Grau: ${rotuloGrau(lesao.grau_clinico)} · Status: ${lesao.status}</p>
          ${
            registrosDaLesao.length
              ? `<table>
                  <thead><tr><th>Data</th><th>Descrição</th><th>Condutas</th><th>Dor (EVA)</th><th>ADM</th></tr></thead>
                  <tbody>${linhasRegistros}</tbody>
                </table>`
              : '<p><em>Sem registros de evolução no período.</em></p>'
          }
          ${galeriaFotos ? `<div class="fotos">${galeriaFotos}</div>` : ''}
        </div>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Arial, sans-serif; color: #0F1B2D; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; color: #5B6B7F; font-weight: normal; margin-top: 0; }
          h3 { font-size: 15px; margin-bottom: 4px; }
          .lesao { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #DCE3EC; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th, td { border: 1px solid #DCE3EC; padding: 6px; text-align: left; }
          .fotos { margin-top: 8px; }
          .rodape { margin-top: 32px; font-size: 11px; color: #5B6B7F; }
        </style>
      </head>
      <body>
        <h1>DermIA — ${titulo}</h1>
        <h2>${nomePaciente} (${codigoPaciente})</h2>
        ${blocosLesoes || '<p>Nenhuma lesão registrada.</p>'}
        <p class="rodape">
          ${tipo === 'alta' ? 'Paciente recebe alta do acompanhamento clínico nesta data. ' : ''}
          Gerado em ${new Date().toLocaleString('pt-BR')} pelo DermIA. Documento de uso clínico —
          contém dados sensíveis de saúde protegidos por sigilo profissional e LGPD.
        </p>
      </body>
    </html>`;
}

export async function gerarECompartilharPDF(html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
