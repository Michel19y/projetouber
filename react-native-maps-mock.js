import { Text, View } from "react-native";

// Um componente quadrado cinza simulando o mapa na tela do PC
const MapViewMock = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: "#e0e0e0",
        justifyContent: "center",
        alignItems: "center",
      },
      style,
    ]}
  >
    <Text style={{ fontWeight: "bold", color: "#666" }}>
      🗺️ [Mapa oculto no Navegador]
    </Text>
    {children}
  </View>
);

const MockComponent = () => null;

export default MapViewMock;
export const Marker = MockComponent;
export const Polyline = MockComponent;
export const Circle = MockComponent;
export const Callout = MockComponent;
