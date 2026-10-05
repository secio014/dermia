module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // Igual ao preset "nativewind/babel", trocando só o runtime de JSX pelo
      // nosso (.lib/jsx), que aplica no app nativo os efeitos que a web pega
      // do global.css. Mudou isto? Rode `expo start -c` para limpar o cache.
      () => ({
        plugins: [
          require("react-native-css-interop/dist/babel-plugin").default,
          [
            "@babel/plugin-transform-react-jsx",
            { runtime: "automatic", importSource: "@dermia/jsx" },
          ],
          "react-native-worklets/plugin",
        ],
      }),
    ],
  };
};
