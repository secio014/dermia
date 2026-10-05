import { Text, View } from 'react-native';

import { useTema } from '@/.lib/tema';

// Renderiza o markdown simples que a IA devolve: parágrafos, listas
// ("- ", "• ", "1. "), **negrito** e _itálico_. Sem dependência externa.

type Trecho = { texto: string; negrito?: boolean; italico?: boolean };

function trechos(linha: string): Trecho[] {
  const partes: Trecho[] = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    if (m.index > ultimo) partes.push({ texto: linha.slice(ultimo, m.index) });
    if (m[1] != null) partes.push({ texto: m[1], negrito: true });
    else partes.push({ texto: m[2], italico: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) partes.push({ texto: linha.slice(ultimo) });
  return partes;
}

function Linha({ texto, className }: { texto: string; className: string }) {
  const { cores } = useTema();
  return (
    <Text className={className}>
      {trechos(texto).map((t, i) => (
        <Text
          key={i}
          style={{
            fontWeight: t.negrito ? '700' : undefined,
            fontStyle: t.italico ? 'italic' : undefined,
            color: t.italico ? cores.secundario : undefined,
          }}>
          {t.texto}
        </Text>
      ))}
    </Text>
  );
}

export default function TextoFormatado({ texto, className = 'text-texto text-sm leading-6' }: { texto: string; className?: string }) {
  const { cores } = useTema();
  const blocos = texto.replace(/\r\n/g, '\n').split('\n');

  return (
    <View className="gap-1.5">
      {blocos.map((bruta, i) => {
        const linha = bruta.trimEnd();
        if (!linha.trim()) return <View key={i} style={{ height: 4 }} />;

        const item = linha.match(/^\s*(?:[-•*]|(\d+)[.)])\s+(.*)$/);
        if (item) {
          return (
            <View key={i} className="flex-row gap-2 pl-0.5">
              {item[1] ? (
                <Text className="text-primaria text-sm font-bold" style={{ minWidth: 16 }}>
                  {item[1]}.
                </Text>
              ) : (
                <View
                  style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cores.primaria, marginTop: 9 }}
                />
              )}
              <View className="flex-1">
                <Linha texto={item[2]} className={className} />
              </View>
            </View>
          );
        }
        return <Linha key={i} texto={linha.replace(/^#+\s*/, '')} className={className} />;
      })}
    </View>
  );
}
