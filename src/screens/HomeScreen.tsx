import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, Home as HomeIcon, Bike, Wrench } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const categories = [
    { id: 'AUTO', label: 'Automóvel', icon: Car, color: '#3B82F6' },
    { id: 'IMOVEL', label: 'Imóvel', icon: HomeIcon, color: '#10B981' },
    { id: 'MOTO', label: 'Motocicleta', icon: Bike, color: '#F59E0B' },
    { id: 'SERVICOS', label: 'Serviços', icon: Wrench, color: '#8B5CF6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Simulador de Consórcio</Text>
        <Text style={styles.subtitle}>Selecione uma categoria para iniciar</Text>
      </View>
      
      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity 
            key={cat.id} 
            style={[styles.catCard, { backgroundColor: cat.color }]}
            onPress={() => navigation.navigate('TableSelection', { category: cat.id })}
          >
            <View style={styles.iconBubble}>
              <cat.icon color="#fff" size={32} />
            </View>
            <Text style={styles.catText}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 16, color: '#64748B', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 16 },
  catCard: { width: '47%', aspectRatio: 1.1, borderRadius: 20, padding: 16, justifyContent: 'space-between', elevation: 3 },
  iconBubble: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  catText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});