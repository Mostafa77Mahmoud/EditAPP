module.exports = function (api) {
  api.cache(() => true);

  const caller = api.caller((cb) => cb && cb.name);
  const isWeb = caller === "babel-loader";

  const plugins = [
    [
      "module-resolver",
      {
        root: ["./app"],
        alias: {
          "@": "./app",
        },
      },
    ],
  ];

  if (!isWeb) {
    try {
      plugins.push(require.resolve("react-native-reanimated/plugin"));
    } catch (e) {
      console.warn("⚠️ Reanimated plugin not found. Skipping...");
    }
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
