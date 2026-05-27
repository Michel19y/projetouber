// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Redireciona para a tela que você quer que seja a primeira (ex: login ou tabs)
  return <Redirect href="/(tabs)" />; 
}