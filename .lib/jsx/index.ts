// O Babel importa `createElement` direto do importSource quando há `key`
// depois de um spread (`<X {...p} key={k} />`) — mesmo comportamento do
// NativeWind: o createElement puro, sem os efeitos.
export { createElement } from 'react-native-css-interop';
