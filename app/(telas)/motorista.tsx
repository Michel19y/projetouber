import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MotoristaScreen() {
  return (
    <View style={styles.container}>
      {/* Área Superior com Ícone ou Ilustração */}
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Text style={styles.emoji}>🚗</Text>
        </View>
        <Text style={styles.title}>Bem-vindo, Motorista!</Text>
        <Text style={styles.subtitle}>
          Sua jornada começa aqui. Acesse sua conta para gerenciar corridas e ganhos em tempo real.
        </Text>
      </View>

      {/* Seção de Botões (Ações Principais) */}
      <View style={styles.buttonSection}>
        <Link href="/(auth)/loginMotorista" asChild>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Entrar na Conta</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(auth)/registerMotorista" asChild>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Quero me Cadastrar</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Rodapé Informativo */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Ao continuar, você concorda com nossos Termos de Serviço.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Preto absoluto para telas OLED
    paddingHorizontal: 30,
    justifyContent: 'space-between', // Distribui os elementos entre topo, meio e fim
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
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  emoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '800', // Extra bold
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonSection: {
    width: '100%',
    gap: 15, // Espaço entre os botões
  },
  primaryButton: {
    backgroundColor: '#34C759', // Verde padrão "Sucesso/Go"
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5, // Sombra no Android
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
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
    color: '#444',
    textAlign: 'center',
  },
});