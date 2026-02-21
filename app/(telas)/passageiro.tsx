import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PassageiroScreen() {
  return (
    <View style={styles.container}>
      {/* Ilustração/Ícone Superior */}
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="map" size={50} color="#007AFF" />
        </View>
        <Text style={styles.title}>Para onde vamos?</Text>
        <Text style={styles.subtitle}>
          Encontre motoristas parceiros próximos a você e viaje com segurança e conforto.
        </Text>
      </View>

      {/* Seção de Botões */}
      <View style={styles.buttonSection}>
        <Link href="/(auth)/loginPassageiro" asChild>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Entrar na Conta</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/registerPassageiro" asChild>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Criar Nova Conta</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Rodapé */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Sua próxima experiência em mobilidade começa aqui.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonSection: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#fff', // Branco para o passageiro (visual clean)
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});