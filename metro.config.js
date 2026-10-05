const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Runtime de JSX do app (ver babel.config.js). Precisa resolver também de
// dentro do node_modules — o alias `@/` só vale para o código do app.
const RUNTIME_JSX = /^@dermia\/jsx(?:\/(jsx-runtime|jsx-dev-runtime))?$/;
const resolverPadrao = config.resolver.resolveRequest;
config.resolver.resolveRequest = (contexto, modulo, plataforma) => {
  const runtime = RUNTIME_JSX.exec(modulo);
  if (runtime) {
    return { type: "sourceFile", filePath: path.resolve(__dirname, ".lib/jsx", `${runtime[1] ?? "index"}.ts`) };
  }
  return (resolverPadrao ?? contexto.resolveRequest)(contexto, modulo, plataforma);
};

module.exports = withNativeWind(config, { input: "./global.css" });
