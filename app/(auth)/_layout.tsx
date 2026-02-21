import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        // Remove o cabeçalho de todas as telas dentro da pasta (auth)
        headerShown: false,
        // Opcional: Garante que o fundo seja preto para evitar "piscada" branca ao navegar
        contentStyle: { backgroundColor: '#121212' }
      }}
    />
  );
}