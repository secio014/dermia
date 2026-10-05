// Runtime de JSX do app: o do NativeWind (className → style) com os efeitos
// nativos de `estilosNativos` por cima. Ligado em babel.config.js.
import * as interop from 'react-native-css-interop/jsx-runtime';

import { comEstilosNativos } from './estilosNativos';

type Jsx = (type: any, props: any, ...resto: any[]) => any;

function envolver(jsx: Jsx): Jsx {
  return (type, props, ...resto) => jsx(type, comEstilosNativos(type, props), ...resto);
}

export const Fragment = interop.Fragment;
export const jsx = envolver(interop.jsx as Jsx);
export const jsxs = envolver(interop.jsxs as Jsx);
