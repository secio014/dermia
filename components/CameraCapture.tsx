import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image, Platform, Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';

export default function CameraCapture({ onCapture }: { onCapture: (uri: string) => void }) {
  const [permissao, solicitarPermissao] = useCameraPermissions();
  const [foto, setFoto] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);

  async function anexarDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!resultado.canceled && resultado.assets[0]?.uri) {
      setFoto(resultado.assets[0].uri);
    }
  }

  if (!permissao) {
    return <View className="flex-1 bg-fundo" />;
  }

  if (!permissao.granted) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-center mb-4">
          Precisamos da câmera para fotografar a lesão — ou anexe uma imagem já existente.
        </Text>
        <Pressable
          onPress={solicitarPermissao}
          className="bg-primaria rounded-xl py-3 px-6 items-center">
          <Text className="text-white font-semibold">Permitir câmera</Text>
        </Pressable>
        <Pressable
          onPress={anexarDaGaleria}
          className="mt-3 bg-superficie border border-borda rounded-xl py-3 px-6 items-center">
          <Text className="text-texto font-semibold">Anexar imagem</Text>
        </Pressable>
      </View>
    );
  }

  async function capturar() {
    const resultado = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
    if (resultado?.uri) setFoto(resultado.uri);
  }

  if (foto) {
    return (
      <View className="flex-1 bg-fundo">
        <Image source={{ uri: foto }} style={{ flex: 1 }} resizeMode="contain" />
        <View className="flex-row gap-3 p-4">
          <Pressable
            onPress={() => setFoto(null)}
            className="flex-1 bg-superficie border border-borda rounded-xl py-3 items-center">
            <Text className="text-texto font-semibold">Refazer</Text>
          </Pressable>
          <Pressable
            onPress={() => onCapture(foto)}
            className="flex-1 bg-primaria rounded-xl py-3 items-center">
            <Text className="text-white font-semibold">Usar foto</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fundo">
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: '75%',
              aspectRatio: 1,
              borderWidth: 3,
              borderColor: '#FFFFFF',
              borderRadius: 16,
              borderStyle: 'dashed',
            }}
          />
        </View>

        {Platform.OS !== 'web' && (
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <View className="p-4 items-center bg-fundo">
        <Pressable
          onPress={capturar}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 4,
            borderColor: palette.primaria,
          }}
          className="items-center justify-center bg-superficie"
        />
        <Pressable onPress={anexarDaGaleria} className="mt-3 flex-row items-center gap-2">
          <Ionicons name="images-outline" size={18} color={palette.primaria} />
          <Text className="text-primaria font-semibold">Anexar imagem da galeria</Text>
        </Pressable>
      </View>
    </View>
  );
}
