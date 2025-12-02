import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView, Dimensions, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, Home as HomeIcon, Bike, Wrench, ChevronRight, LayoutGrid } from 'lucide-react-native';

import { RootStackParamList } from '../types/navigation';
import { Category } from '../../data/TableRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface CategoryOption {
    id: Category;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    bgLight: string;
}

const { width } = Dimensions.get('window');
const PADDING_HORIZONTAL = 24;
const GAP = 12;
// Ajuste de layout para web/mobile
const COLUMNS = width > 768 ? 4 : 2; 
const CARD_WIDTH = (width - (PADDING_HORIZONTAL * 2) - (GAP * (COLUMNS - 1))) / COLUMNS;

export default function HomeScreen({ navigation }: Props) {

  const categories: CategoryOption[] = [
      { 
          id: 'AUTO', 
          label: 'Automóvel', 
          description: 'Carros novos e seminovos',
          icon: Car, 
          color: '#2563EB', 
          bgLight: '#EFF6FF' 
      },
      { 
          id: 'IMOVEL', 
          label: 'Imóvel', 
          description: 'Casas, aptos e terrenos',
          icon: HomeIcon, 
          color: '#059669', 
          bgLight: '#ECFDF5' 
      },
      { 
          id: 'MOTO', 
          label: 'Moto', 
          description: 'Motos de todas as cilindradas',
          icon: Bike, 
          color: '#D97706', 
          bgLight: '#FFFBEB' 
      },
      { 
          id: 'SERVICOS', 
          label: 'Serviços', 
          description: 'Reformas, festas e viagens',
          icon: Wrench, 
          color: '#7C3AED', 
          bgLight: '#F5F3FF' 
      },
  ];

  const handleNavigate = (category: Category) => {
      // pass the required params (category and tables) expected by the route type
      navigation.navigate('TableSelection', { category, tables: [] }); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
            <View style={styles.headerIcon}>
                <LayoutGrid size={24} color="#0F172A" />
            </View>
            <View>
                <Text style={styles.headerTitle}>Simulador Recon</Text>
                <Text style={styles.headerSubtitle}>Selecione uma categoria para iniciar</Text>
            </View>
        </View>

        {/* GRID */}
        <View style={styles.gridContainer}>
            {categories.map((cat) => (
                <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.card, { width: Platform.OS === 'web' ? '48%' : CARD_WIDTH }]} 
                    onPress={() => handleNavigate(cat.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: cat.bgLight }]}>
                        <cat.icon size={28} color={cat.color} />
                    </View>
                    
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>{cat.label}</Text>
                        <Text style={styles.cardDesc}>{cat.description}</Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={[styles.cardAction, { color: cat.color }]}>Simular</Text>
                        <ChevronRight size={16} color={cat.color} />
                    </View>
                </TouchableOpacity>
            ))}
        </View>

        {/* INFO FOOTER */}
        <View style={styles.footerInfo}>
             <Text style={styles.footerText}>Versão Web 1.0.2 • Recon Consórcios</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, marginTop: Platform.OS === 'web' ? 20 : 40 },
  headerIcon: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#64748B', shadowOpacity: 0.05, shadowOffset: { width:0, height:4 }, elevation: 2 },
  iconContainer: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardContent: { marginBottom: 16, flex: 1 },
  cardLabel: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 4 },
  cardAction: { fontSize: 13, fontWeight: '700' },

  footerInfo: { marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' }
});