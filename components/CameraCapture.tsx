import { useRef, useState, type ReactNode } from 'react';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';

import BotaoBrilho from '@/components/efeitos/BotaoBrilho';
import { DRIVER_NATIVO } from '@/components/efeitos/movimento';
import Particulas from '@/components/efeitos/Particulas';
import RealceLesao, { COR_ACOLHEDORA } from '@/components/efeitos/RealceLesao';
import Surgir from '@/components/efeitos/Surgir';
import Vidro from '@/components/efeitos/Vidro';
import { useTema } from '@/.lib/tema';

const web = Platform.OS === 'web';

// Filtro suave SÓ de exibição: menos contraste e saturação, um toque mais
// claro e quente. A foto enviada (e analisada pela IA) é sempre a original —
// alterar a imagem clínica atrapalharia a avaliação da lesão.
// (`filter` é CSS na web; no nativo o RN aplica o que a plataforma suporta.)
const FILTRO_SUAVE = 'contrast(0.9) saturate(0.92) brightness(1.04) sepia(0.06)';

// Indicador "1 Enquadrar · 2 Conferir · 3 Enviar" — deixa claro onde o
// usuário está no fluxo da foto.
const ETAPAS = ['Enquadrar', 'Conferir', 'Enviar'];
function Etapas({ atual, claro }: { atual: 0 | 1; claro?: boolean }) {
  const { cores } = useTema();
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {ETAPAS.map((rotulo, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        const corTexto = claro ? '#FFFFFF' : cores.texto;
        return (
          <View key={rotulo} className="flex-row items-center gap-1.5">
            {i > 0 && (
              <View style={{ width: 14, height: 1.5, borderRadius: 1, backgroundColor: corTexto, opacity: 0.25 }} />
            )}
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ativo || feito ? cores.primaria : 'transparent',
                borderWidth: ativo || feito ? 0 : 1.5,
                borderColor: corTexto,
                opacity: ativo || feito ? 1 : 0.45,
              }}>
              {feito ? (
                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
              ) : (
                <Text style={{ color: ativo ? '#FFFFFF' : corTexto, fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>
              )}
            </View>
            <Text style={{ color: corTexto, opacity: ativo ? 1 : 0.55, fontSize: 11, fontWeight: ativo ? '700' : '500' }}>
              {rotulo}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function CameraCapture({ onCapture }: { onCapture: (uri: string) => void }) {
  const { cores } = useTema();
  const [permissao, solicitarPermissao] = useCameraPermissions();
  const [foto, setFoto] = useState<string | null>(null);
  const [verOriginal, setVerOriginal] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const flash = useRef(new Animated.Value(0)).current;

  function mostrarPrevia(uri: string) {
    setVerOriginal(false);
    setFoto(uri);
  }

  async function anexarDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!resultado.canceled && resultado.assets[0]?.uri) mostrarPrevia(resultado.assets[0].uri);
  }

  async function capturar() {
    // "Flash" branco suave que dissolve — confirma o clique sem sobressalto.
    flash.setValue(0.7);
    Animated.timing(flash, {
      toValue: 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: DRIVER_NATIVO,
    }).start();
    const resultado = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
    if (resultado?.uri) mostrarPrevia(resultado.uri);
  }

  const camadaFlash = (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF8F5', opacity: flash }]}
    />
  );

  // ── Sem permissão ─────────────────────────────────────────────────────────
  if (!permissao) return <View className="flex-1 bg-fundo" />;

  if (!permissao.granted) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Particulas cor={COR_ACOLHEDORA} quantidade={8} />
        <Surgir className="items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: cores.primariaSuave }}>
            <Ionicons name="camera-outline" size={30} color={cores.primaria} />
          </View>
          <Text className="text-texto text-center mb-5">
            Precisamos da câmera para fotografar a lesão — ou anexe uma imagem já existente.
          </Text>
          <BotaoBrilho
            corBrilho={cores.primaria}
            onPress={solicitarPermissao}
            className="bg-primaria rounded-xl py-3 px-6 items-center">
            <Text className="text-white font-semibold">Permitir câmera</Text>
          </BotaoBrilho>
          <BotaoBrilho
            corBrilho={cores.primaria}
            onPress={anexarDaGaleria}
            className="mt-3 bg-superficie border border-borda rounded-xl py-3 px-6 items-center">
            <Text className="text-texto font-semibold">Anexar imagem</Text>
          </BotaoBrilho>
        </Surgir>
      </View>
    );
  }

  // ── Prévia + confirmação ──────────────────────────────────────────────────
  if (foto) {
    const imagem = (
      <View style={{ flex: 1, borderRadius: web ? 20 : 0, overflow: 'hidden', backgroundColor: '#000' }}>
        <Image
          source={{ uri: foto }}
          style={[
            { width: '100%', height: '100%' },
            verOriginal ? null : ({ filter: FILTRO_SUAVE } as object),
          ]}
          resizeMode={web ? 'cover' : 'contain'}
        />
        {!verOriginal && <RealceLesao veu={0.3} pulsar={false} tamanho="80%" />}
      </View>
    );

    const acoes = (
      <View className={web ? 'gap-3' : 'flex-row gap-3'}>
        <BotaoBrilho
          corBrilho={cores.primaria}
          onPress={() => setFoto(null)}
          className={`${web ? '' : 'flex-1'} bg-superficie border border-borda rounded-xl py-3 px-4 flex-row items-center justify-center gap-2`}>
          <Ionicons name="refresh" size={16} color={cores.texto} />
          <Text className="text-texto font-semibold">Refazer</Text>
        </BotaoBrilho>
        <BotaoBrilho
          corBrilho={cores.primaria}
          onPress={() => onCapture(foto)}
          className={`${web ? '' : 'flex-1'} bg-primaria rounded-xl py-3 px-4 flex-row items-center justify-center gap-2`}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold">Usar foto</Text>
        </BotaoBrilho>
      </View>
    );

    const alternarOriginal = (
      <BotaoBrilho
        corBrilho={cores.primaria}
        onPress={() => setVerOriginal((v) => !v)}
        className="flex-row items-center justify-center gap-1.5 py-1.5">
        <Ionicons name={verOriginal ? 'color-filter-outline' : 'eye-outline'} size={15} color={cores.primaria} />
        <Text className="text-primaria text-xs font-semibold">
          {verOriginal ? 'Ver com suavização' : 'Ver cores originais'}
        </Text>
      </BotaoBrilho>
    );

    if (web) {
      return (
        <View className="flex-1 bg-fundo items-center justify-center p-6">
          <Particulas cor={COR_ACOLHEDORA} quantidade={10} />
          <Surgir key={foto} de="direita" className="flex-row items-center gap-6">
            <View style={{ width: 380, maxWidth: '100%', aspectRatio: 1 }}>{imagem}</View>
            <Vidro style={{ width: 230, borderRadius: 20, padding: 18 }} className="gap-3">
              <Etapas atual={1} />
              <Text className="text-texto font-semibold">Confira a foto</Text>
              <Text className="text-secundario text-xs">
                A lesão está nítida e dentro da área realçada? Se sim, use a foto.
              </Text>
              {acoes}
              {alternarOriginal}
            </Vidro>
          </Surgir>
        </View>
      );
    }

    return (
      <Surgir key={foto} de="nenhum" duracao={360} className="flex-1 bg-fundo">
        <View style={{ flex: 1 }}>{imagem}</View>
        <View className="p-4 gap-2">
          <Etapas atual={1} />
          <Text className="text-secundario text-xs text-center">
            A lesão está nítida e dentro da área realçada?
          </Text>
          {acoes}
          {alternarOriginal}
        </View>
      </Surgir>
    );
  }

  // ── Câmera ────────────────────────────────────────────────────────────────
  const botaoCaptura = (
    <BotaoBrilho
      corBrilho={COR_ACOLHEDORA}
      onPress={capturar}
      accessibilityLabel="Tirar foto"
      style={{
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cores.primaria }} />
    </BotaoBrilho>
  );

  const linkGaleria = (rotulo: string, cor: string): ReactNode => (
    <BotaoBrilho corBrilho={cores.primaria} onPress={anexarDaGaleria} className="flex-row items-center gap-2 px-2 py-1 rounded-lg">
      <Ionicons name="images-outline" size={18} color={cor} />
      <Text style={{ color: cor }} className="font-semibold">
        {rotulo}
      </Text>
    </BotaoBrilho>
  );

  if (web) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center p-6">
        <Particulas cor={COR_ACOLHEDORA} quantidade={10} />
        <Surgir className="flex-row items-center gap-6">
          <View style={{ width: 380, maxWidth: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden' }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
            <RealceLesao />
            {camadaFlash}
          </View>
          <Vidro style={{ width: 230, borderRadius: 20, padding: 18 }} className="items-center gap-4">
            <Etapas atual={0} />
            <Text className="text-secundario text-xs text-center">
              Centralize a lesão na área realçada, com boa luz, e capture.
            </Text>
            {botaoCaptura}
            {linkGaleria('Anexar imagem', cores.primaria)}
          </Vidro>
        </Surgir>
      </View>
    );
  }

  return (
    <Surgir de="nenhum" className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
      <RealceLesao />
      {camadaFlash}

      <BotaoBrilho
        corBrilho={COR_ACOLHEDORA}
        onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        accessibilityLabel="Trocar câmera"
        style={{ position: 'absolute', top: 16, right: 16 }}>
        <Vidro tom="escuro" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        </Vidro>
      </BotaoBrilho>

      <Vidro
        tom="escuro"
        style={{ position: 'absolute', left: 16, right: 16, bottom: 20, borderRadius: 24, paddingVertical: 14 }}
        className="items-center gap-2">
        <Etapas atual={0} claro />
        <Text className="text-white text-xs opacity-80">Centralize a lesão na área realçada</Text>
        {botaoCaptura}
        {linkGaleria('Anexar da galeria', '#FFFFFF')}
      </Vidro>
    </Surgir>
  );
}
