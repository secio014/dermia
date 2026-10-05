import type { ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// Pressable com brilho suave ao passar o mouse (web) e leve afundar ao tocar.
// `hovered` existe no estado do Pressable do react-native-web, não nos tipos.
type Estado = { pressed: boolean; hovered?: boolean };

export default function BotaoBrilho({
  children,
  corBrilho,
  style,
  className,
  ...resto
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  corBrilho: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  return (
    <Pressable
      {...resto}
      className={className}
      style={(estado) => {
        const { pressed, hovered } = estado as Estado;
        const brilho =
          Platform.OS === 'web'
            ? ({
                transition: 'box-shadow 220ms ease, transform 160ms ease',
                boxShadow: hovered ? `0 0 0 3px ${corBrilho}33, 0 6px 22px ${corBrilho}55` : '0 0 0 0 transparent',
              } as object)
            : null;
        return [style, brilho, { transform: [{ scale: pressed ? 0.97 : hovered ? 1.02 : 1 }] }];
      }}>
      {children}
    </Pressable>
  );
}
