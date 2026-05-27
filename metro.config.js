const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Intercepta o 'react-native-maps' apenas quando rodar no Navegador (Web)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-maps" && platform === "web") {
    return {
      filePath: path.resolve(__dirname, "react-native-maps-mock.js"),
      type: "sourceFile",
    };
  }
  // Segue o fluxo padrão para Android/iOS (APK)
  return context.resolveRequest
    ? context.resolveRequest(context, moduleName, platform)
    : context.constructor.prototype.resolveRequest(
        context,
        moduleName,
        platform,
      );
};

module.exports = config;
