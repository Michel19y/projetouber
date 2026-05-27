import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.mainTitle}>Como vamos viajar hoje?</Text>
        <Text style={styles.subtitle}>Selecione seu perfil para continuar</Text>
      </View>

      <View style={styles.choiceContainer}>
        {/* Motorista */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(telas)/motorista')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#34C75920' }]}>
            <Ionicons name="car-sport" size={40} color="#34C759" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Sou Motorista</Text>
            <Text style={styles.cardDescription}>Quero dirigir e gerar ganhos</Text>
          </View>
        </TouchableOpacity>

        {/* Admin */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(auth)/loginDashboard')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#FF950020' }]}>
            <Ionicons name="settings" size={40} color="#FF9500" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Sou Admin</Text>
            <Text style={styles.cardDescription}>Quero gerenciar o sistema</Text>
          </View>
        </TouchableOpacity>

        {/* Passageiro */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(telas)/passageiro')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#007AFF20' }]}>
            <Ionicons name="person" size={40} color="#007AFF" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Sou Passageiro</Text>
            <Text style={styles.cardDescription}>Quero solicitar uma viagem</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Versão 1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 25,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    fontWeight: '400',
  },
  choiceContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});