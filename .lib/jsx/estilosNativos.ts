import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

/*
 * Contraparte nativa (iOS/Android) dos efeitos visuais do global.css.
 *
 * Na web, o global.css pinta sombra nos cartões, luz difusa no fundo e
 * gradiente nos botões principais usando seletores compostos
 * (`.bg-superficie.rounded-xl.border`, `[role='button'].bg-primaria`…). O
 * NativeWind só entende seletores de UMA classe — no app essas regras
 * simplesmente não existiam e tudo ficava "chapado".
 *
 * Aqui as mesmas combinações de classe viram estilo nativo (`boxShadow` e
 * `experimental_backgroundImage`, suportados pelo RN na nova arquitetura),
 * aplicados no momento do JSX — nenhuma tela precisa mudar. Mexeu num efeito
 * no global.css? Ajuste o equivalente aqui.
 *
 * As cores dos efeitos são translúcidas sobre a cor de fundo do próprio
 * elemento (que vem do tema via className), então funcionam no claro e no
 * escuro sem precisar ler o tema.
 */

const SOMBRA_CARTAO = '0 1px 2px rgba(43, 15, 12, 0.05), 0 8px 24px -12px rgba(200, 30, 58, 0.22)';

// Botão principal: o fundo já é `bg-primaria` (do tema); o gradiente só puxa
// o canto oposto para o laranja da marca, como o linear-gradient da web.
const BRILHO_PRIMARIO = 'linear-gradient(135deg, rgba(255, 122, 89, 0) 0%, rgba(255, 122, 89, 1) 100%)';
const SOMBRA_PRIMARIO = '0 6px 18px -10px rgba(200, 30, 58, 0.8)';

// Fundo vivo: as duas manchas de luz do `.bg-fundo` da web.
const LUZ_FUNDO =
  'radial-gradient(ellipse 90% 45% at 85% 0%, rgba(200, 30, 58, 0.07) 0%, rgba(200, 30, 58, 0) 70%), ' +
  'radial-gradient(ellipse 80% 40% at 0% 100%, rgba(255, 138, 101, 0.06) 0%, rgba(255, 138, 101, 0) 70%)';

// Equivalente ao `[role='button']:active` da web.
const PRESSIONADO = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const CONTEINERES_DE_TELA = new Set<unknown>([View, ScrollView, KeyboardAvoidingView]);

type Estilo = Record<string, unknown>;
type Props = { className?: unknown; style?: unknown; [chave: string]: unknown };

function estiloExtra(type: unknown, classes: Set<string>): Estilo | null {
  const ehView = type === View;
  const ehPressable = type === Pressable;
  let extra: Estilo | null = null;

  if (
    (ehView || ehPressable) &&
    classes.has('bg-superficie') &&
    classes.has('border') &&
    (classes.has('rounded-xl') || classes.has('rounded-2xl'))
  ) {
    extra = { boxShadow: SOMBRA_CARTAO };
  }

  if (ehPressable && classes.has('bg-primaria')) {
    extra = { experimental_backgroundImage: BRILHO_PRIMARIO, boxShadow: SOMBRA_PRIMARIO };
  }

  if (CONTEINERES_DE_TELA.has(type) && classes.has('bg-fundo') && classes.has('flex-1')) {
    extra = { experimental_backgroundImage: LUZ_FUNDO };
  }

  return extra;
}

/** Pressable "visível" (botão, cartão, chip) que ainda não cuida do toque. */
function querFeedbackDeToque(type: unknown, classes: Set<string>, style: unknown, className: string): boolean {
  if (type !== Pressable || typeof style === 'function' || className.includes('active:')) return false;
  for (const c of classes) {
    if (c.startsWith('bg-') || c === 'border') return true;
  }
  return false;
}

/** Devolve as props com os efeitos nativos aplicados (ou as mesmas props). */
export function comEstilosNativos(type: unknown, props: Props | null | undefined): Props | null | undefined {
  if (Platform.OS === 'web' || !props || typeof props.className !== 'string') return props;

  const className = props.className;
  const classes = new Set(className.split(/\s+/));
  const extra = estiloExtra(type, classes);
  const toque = querFeedbackDeToque(type, classes, props.style, className);
  if (!extra && !toque) return props;

  // O efeito vem antes: `style` explícito da tela continua mandando.
  const original = props.style;
  if (typeof original === 'function') {
    return { ...props, style: (estado: unknown) => [extra, original(estado)] };
  }
  if (toque) {
    return {
      ...props,
      style: ({ pressed }: { pressed: boolean }) => [extra, pressed && PRESSIONADO, original],
    };
  }
  return { ...props, style: [extra, original] };
}
