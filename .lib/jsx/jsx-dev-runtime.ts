// Ver jsx-runtime.ts.
import * as interop from 'react-native-css-interop/jsx-dev-runtime';

import { comEstilosNativos } from './estilosNativos';

type Jsx = (type: any, props: any, ...resto: any[]) => any;

export const Fragment = interop.Fragment;
export const jsxDEV: Jsx = (type, props, ...resto) =>
  (interop.jsxDEV as Jsx)(type, comEstilosNativos(type, props), ...resto);
