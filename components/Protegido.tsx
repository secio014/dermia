import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import SemAcesso from '@/components/ui/SemAcesso';
import { palette } from '@/constants/Colors';
import { papelPode, usePapelEfetivo, usePerfilAtual, type Papel, type Permissao } from '@/.lib/acesso';

/**
 * Envolve uma tela/área que só alguns papéis podem ver. Enquanto o perfil
 * carrega mostra um spinner; se o usuário não tem acesso, mostra <SemAcesso>.
 *
 *   <Protegido permissao="painel_admin"><PainelAdmin /></Protegido>
 *   <Protegido papel="admin">...</Protegido>
 *
 * O vínculo (conta na clínica, ativo) é checado pelo papel REAL; a permissão em
 * si respeita o "Ver como" do admin_geral — assim ele consegue conferir que uma
 * área fica bloqueada na visão de um fisioterapeuta, por exemplo.
 */
export default function Protegido({
  permissao,
  papel,
  children,
}: {
  permissao?: Permissao;
  papel?: Papel | Papel[];
  children: ReactNode;
}) {
  const { perfil, carregando } = usePerfilAtual();
  const { papel: papelEfetivo, simulando } = usePapelEfetivo();

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  const papeisAceitos = papel ? ([] as Papel[]).concat(papel) : null;

  const semPapel = papeisAceitos && (!papelEfetivo || !papeisAceitos.includes(papelEfetivo));
  const semPermissao = permissao && !papelPode(papelEfetivo, permissao);

  const mensagem = !perfil
    ? 'Sua conta não está vinculada a nenhuma clínica. Fale com o administrador.'
    : !perfil.ativo
      ? 'Seu acesso foi desativado. Fale com o administrador da clínica.'
      : semPapel || semPermissao
        ? simulando
          ? `Nesta visão simulada (${simulando}) esta área fica indisponível.`
          : semPapel
            ? 'Você não tem o perfil necessário para acessar esta área.'
            : 'Esta área é restrita a administradores da clínica.'
        : null;

  if (mensagem) return <SemAcesso mensagem={mensagem} />;

  return <>{children}</>;
}
