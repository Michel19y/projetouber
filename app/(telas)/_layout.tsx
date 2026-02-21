

import { Stack } from 'expo-router';

export default function TelasLayout() {
  return (
    <Stack
      screenOptions={{
        // 1. Ativa o cabeçalho para a seta aparecer
        headerShown: true, 
        
        // 2. Esconde o nome da pasta/arquivo
        headerTitle: "", 
        
        // 3. Deixa o fundo transparente para não tapar o seu layout preto
        headerTransparent: true, 
        
        // 4. Cor da seta de voltar
        headerTintColor: '#fff', 

        // 5. Remove sombra/linha embaixo do header
        headerShadowVisible: false,
      }}
    >
      {/* Importante: A tela 'index' (Bem-vindo) não deve ter seta de voltar, 
         pois é a primeira tela. Por isso forçamos false nela.
      */}
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}
