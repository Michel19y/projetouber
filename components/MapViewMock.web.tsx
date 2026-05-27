import { View } from 'react-native';

export default function MapView({ style, children }: any) {
  return <View style={[{ backgroundColor: '#1a1a1a' }, style]}>{children}</View>;
}

export const Marker = () => null;
export const Polyline = () => null;