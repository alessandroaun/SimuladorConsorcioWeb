module.exports = function(api) {
  // Detecta se o Babel está sendo chamado pelo Webpack ou loader da Web
  const isWeb = api.caller((caller) => caller && caller.name === 'babel-loader');

  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Só ativa o plugin do Reanimated se NÃO for Web
      // Isso evita o erro "Cannot find module react-native-worklets/plugin" no navegador
      !isWeb && 'react-native-reanimated/plugin',
    ].filter(Boolean),
  };
};