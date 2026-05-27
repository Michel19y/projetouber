import { supabase } from "@/src/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";

import React, { JSX, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "email" | "numeric" | "date" | "boolean" | "json";
  editable?: boolean;
};

type TableConfig = {
  title: string;
  fields: FieldConfig[];
};

export default function Dashboard(): JSX.Element {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [currentTable, setCurrentTable] = useState<string>("motoristas");
  const [tableConfigs, setTableConfigs] = useState<Record<string, TableConfig>>(
    {},
  );
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCrudActions, setShowCrudActions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const sidebarAnim = useState(new Animated.Value(-250))[0];

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (configLoaded) fetchData();
  }, [currentTable, configLoaded]);

  useEffect(() => {
    if (showSidebar) {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -250,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [showSidebar]);

  async function adminFetch(path: string, method: string, body?: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sem sessão");

    const response = await fetch(`http://localhost:3001/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erro no servidor");
    return result;
  }

  async function loadConfig() {
    try {
      const config = await adminFetch("/admin/config", "GET");
      setTableConfigs(config);
      setConfigLoaded(true);
    } catch (err: any) {
      console.error("Erro ao carregar config:", err.message);
      if (err.message === "Sem sessão") router.replace("/(tabs)");
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const result = await adminFetch(`/admin/data/${currentTable}`, "GET");
      setData(result || []);
    } catch (error: any) {
      console.error("[Erro ao buscar dados do Back]:", error.message);
      if (error.message === "Sem sessão") router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert("Confirmar Saída", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.removeItem("@user_type");
          router.replace("/(tabs)");
        },
      },
    ]);
  }

  const selectTable = (tab: string) => {
    setCurrentTable(tab);
    setShowSidebar(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({});
    setIsModalVisible(true);
  };

  const openEditModal = (item: any) => {
    const config = tableConfigs[currentTable];
    const initialForm: Record<string, any> = {};
    config.fields.forEach((field) => {
      let value = item[field.key];
      if (value !== undefined) {
        if (field.type === "json") value = JSON.stringify(value);
        else if (field.type === "date")
          value = new Date(value).toISOString().slice(0, 19);
        else if (field.type === "boolean") value = value ? "true" : "false";
        else value = value?.toString() ?? "";
        initialForm[field.key] = value;
      }
    });
    setFormData(initialForm);
    setEditingItem(item);
    setIsModalVisible(true);
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(formData).length === 0) {
      Alert.alert("Erro", "Preencha os campos");
      return;
    }

    const msg = editingItem
      ? "Deseja atualizar este registro?"
      : "Deseja criar este novo registro?";

    // Alert.alert não funciona na web — usa confirm como fallback
    if (typeof window !== "undefined") {
      if (window.confirm(msg)) performSave();
    } else {
      Alert.alert(
        editingItem ? "Confirmar Atualização" : "Confirmar Criação",
        msg,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Confirmar", onPress: () => performSave() },
        ],
      );
    }
  };

  async function performSave() {
    setLoading(true);
    const config = tableConfigs[currentTable];
    const payload: Record<string, any> = {};

    try {
      config.fields.forEach((field) => {
        if (field.editable !== false && formData[field.key] !== undefined) {
          let val = formData[field.key];
          if (field.type === "numeric") val = parseFloat(val) || 0;
          else if (field.type === "boolean") val = val.toLowerCase() === "true";
          else if (field.type === "json") val = JSON.parse(val);
          else if (field.type === "date") val = new Date(val).toISOString();
          payload[field.key] = val;
        }
      });

      if (editingItem) {
        await adminFetch(
          `/admin/data/${currentTable}/${editingItem.id}`,
          "PUT",
          payload,
        );
        Alert.alert("Sucesso", "Registro atualizado!");
      } else {
        if (currentTable === "motoristas") {
          payload.status = payload.status || "pendente";
        }
        await adminFetch(`/admin/data/${currentTable}`, "POST", payload);
        Alert.alert("Sucesso", "Registro adicionado!");
      }

      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Verifique JSON ou formatos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir este registro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await adminFetch(`/admin/data/${currentTable}/${id}`, "DELETE");
              fetchData();
            } catch (err: any) {
              Alert.alert("Erro", err.message || "Não foi possível excluir");
            }
          },
        },
      ],
    );
  }

  async function approveDriver(item: any) {
    Alert.alert("Aprovar Motorista", `Aprovar ${item.nome}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Aprovar",
        style: "default",
        onPress: async () => {
          try {
            await adminFetch(
              `/admin/data/motoristas/${item.id}/aprovar`,
              "PATCH",
            );
            Alert.alert("Sucesso", "Motorista aprovado!");
            fetchData();
          } catch (err: any) {
            Alert.alert("Erro", err.message);
          }
        },
      },
    ]);
  }

  const formatValue = (item: any, field: FieldConfig) => {
    let value = item[field.key];

    if (field.key === "passenger_id" && currentTable === "rides") {
      return item.passageiros?.nome ?? (value ? value.toString() : "N/A");
    }
    if (field.key === "driver_id" && currentTable === "rides") {
      return item.motoristas?.nome ?? (value ? value.toString() : "N/A");
    }

    if (value == null) return "N/A";
    if (field.type === "json")
      return JSON.stringify(value).substring(0, 50) + "...";
    if (field.type === "date")
      return new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    if (field.type === "boolean") return value ? "Sim" : "Não";
    if (field.type === "numeric") return value.toFixed(2);
    return value.toString().substring(0, 50);
  };

  const currentConfig = tableConfigs[currentTable];

  const renderItem = ({ item }: { item: any }) => {
    if (!currentConfig) return null;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => showCrudActions && openEditModal(item)}
        >
          {currentConfig.fields.map((field) => (
            <Text key={field.key} style={styles.fieldText}>
              {field.label}: {formatValue(item, field)}
            </Text>
          ))}
        </TouchableOpacity>
        {showCrudActions && (
          <View style={styles.actions}>
            {currentTable === "motoristas" && item.status !== "aprovado" && (
              <TouchableOpacity
                onPress={() => approveDriver(item)}
                style={styles.actionBtn}
              >
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              style={styles.actionBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (!configLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF9500" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowSidebar(true)}>
          <Ionicons name="menu-outline" size={30} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.mainTitle}>Master Admin</Text>
          <Text style={styles.subtitle}>{currentConfig?.title}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.crudBtn, showCrudActions && styles.crudBtnActive]}
            onPress={() => setShowCrudActions(!showCrudActions)}
          >
            <Ionicons
              name="settings-outline"
              size={26}
              color={showCrudActions ? "#000" : "#fff"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF9500" style={styles.loader} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum registro encontrado nesta tabela.
            </Text>
          }
        />
      )}

      {showCrudActions && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Ionicons name="add" size={32} color="#000" />
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.sidebar, { left: sidebarAnim }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Selecionar Tabela</Text>
          <TouchableOpacity onPress={() => setShowSidebar(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        {Object.keys(tableConfigs).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => selectTable(tab)}
            style={styles.sidebarItem}
          >
            <Text style={styles.sidebarItemText}>
              {tab.replace("_", " ").toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingItem ? "Editar Registro" : "Novo registro"}
            </Text>
            <ScrollView>
              {currentConfig?.fields
                .filter((field) => field.editable !== false)
                .map((field) => (
                  <View key={field.key} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={field.label}
                      placeholderTextColor="#666"
                      value={formData[field.key]?.toString() || ""}
                      onChangeText={(text) =>
                        handleInputChange(field.key, text)
                      }
                      keyboardType={
                        field.type === "numeric"
                          ? "numeric"
                          : field.type === "email"
                            ? "email-address"
                            : "default"
                      }
                      autoCapitalize="none"
                    />
                  </View>
                ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingItem ? "ATUALIZAR" : "SALVAR"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerActions: { flexDirection: "row", gap: 12 },
  crudBtn: { padding: 8, borderRadius: 12, backgroundColor: "#1f1f1f" },
  crudBtnActive: { backgroundColor: "#FF9500" },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1,
  },
  subtitle: { fontSize: 14, color: "#FF9500", fontWeight: "600", marginTop: 2 },
  profileBtn: { padding: 8, borderRadius: 12, backgroundColor: "#1f1f1f" },
  card: {
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#222",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  cardContent: { flex: 1 },
  fieldText: { fontSize: 12, color: "#ddd", lineHeight: 16 },
  actions: { flexDirection: "column", justifyContent: "flex-start", gap: 6 },
  actionBtn: { padding: 4 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF9500",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  listContent: { paddingBottom: 100 },
  loader: { marginTop: 80 },
  emptyText: {
    textAlign: "center",
    color: "#555",
    marginTop: 80,
    fontSize: 16,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "#111",
    paddingTop: 60,
    borderRightWidth: 1,
    borderRightColor: "#222",
    zIndex: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  sidebarTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  sidebarItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#222" },
  sidebarItemText: { color: "#ddd", fontSize: 16, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#222",
    alignItems: "center",
  },
  cancelBtnText: { color: "#ccc", fontWeight: "700" },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FF9500",
    alignItems: "center",
  },
  saveBtnText: { color: "#000", fontWeight: "800", fontSize: 16 },
});
