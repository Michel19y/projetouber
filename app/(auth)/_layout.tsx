import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
        screenOptions={{
     
        // 2. Esconde o nome da pasta/arquivo
        headerTitle: "", 
          // 4. Cor da seta de voltar
        headerTintColor: '#fff', 
        // 3. Deixa o fundo transparente para não tapar o seu layout preto
        headerTransparent: true, 
      
        // 5. Remove sombra/linha embaixo do header
        headerShadowVisible: false,
      }}
    />
  );
}