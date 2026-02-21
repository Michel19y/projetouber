import { supabase } from '@/src/lib/supabase';
import React, {JSX, useEffect, useState} from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator
} from 'react-native';

// 🔹 Tipo da tabela
type Motorista = {
    id: number;
    nome: string;
    cpf: string;
    telefone: string;
    created_at: string;
};

export default function Dashboard(): JSX.Element {
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const carregarMotoristas = async () => {
            try {
                const { data, error } = await supabase
                    .from('motoristas_pretendentes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    setMotoristas(data);
                }
            } catch (error) {
                console.error('Erro ao buscar motoristas:', error);
            } finally {
                setLoading(false);
            }
        };

        carregarMotoristas();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Motoristas Pretendentes</Text>

            <FlatList
                data={motoristas}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.nome}>{item.nome}</Text>
                        <Text>CPF: {item.cpf}</Text>
                        <Text>Telefone: {item.telefone}</Text>
                        <Text style={styles.data}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', marginTop: 20 }}>
                        Nenhum motorista encontrado.
                    </Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f1f5f9'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    card: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2
    },
    nome: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    data: {
        marginTop: 4,
        fontSize: 12,
        color: '#555'
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});