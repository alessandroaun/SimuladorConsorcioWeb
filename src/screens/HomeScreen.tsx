import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView, useWindowDimensions, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Car, Home as HomeIcon, Bike, Wrench, ChevronRight, FileText, LayoutGrid } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { DataService } from '../services/DataService'; 
import { Category } from '../../data/TableRepository'; 

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface BaseCategory {
    id: Category;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
    bgLight: string;
}

const PADDING_HORIZONTAL = 24;
const GAP = 12;
const MAX_CONTENT_WIDTH = 1024;

export default function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();

  const baseCategories: BaseCategory[] = [
    { id: 'AUTO', label: 'Automóvel', description: 'Carros novos e seminovos', icon: Car, color: '#2563EB', bgLight: '#EFF6FF' },
    { id: 'IMOVEL', label: 'Imóvel', description: 'Casas, aptos e terrenos', icon: HomeIcon, color: '#059669', bgLight: '#ECFDF5' },
    { id: 'MOTO', label: 'Motocicleta', description: 'Motos de todas as cilindradas', icon: Bike, color: '#D97706', bgLight: '#FFFBEB' },
    { id: 'SERVICOS', label: 'Serviços', description: 'Reformas, festas e viagens', icon: Wrench, color: '#7C3AED', bgLight: '#F5F3FF' }
  ];

  const isDesktop = width > 768;
  const numColumns = isDesktop ? 4 : 2;
  const actualContentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const cardWidth = (actualContentWidth - (PADDING_HORIZONTAL * 2) - (GAP * (numColumns - 1))) / numColumns;

  const allTables = DataService.tables;
  const countTables = (catId: Category) => allTables.filter(t => t.category === catId).length;

  const handleNavigateToSelection = () => {
    navigation.navigate('TableSelection' as never); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.centerContainer}>
        <View style={[styles.contentWrapper, { maxWidth: MAX_CONTENT_WIDTH }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>Bem-vindo ao</Text>
                    <Text style={styles.headerTitle}>Simulador Recon</Text>
                </View>
                <View style={styles.logoBadge}>
                    <LayoutGrid size={20} color="#334155" />
                </View>
            </View>

            <TouchableOpacity style={styles.groupsButton} activeOpacity={0.8} onPress={handleNavigateToSelection}>
                <View style={styles.groupsButtonContent}>
                    <View style={styles.groupsIconBadge}>
                        <FileText size={20} color="#fff" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.groupsTitle}>Relação de Grupos</Text>
                        <Text style={styles.groupsSubtitle}>Visualize todos os planos disponíveis</Text>
                    </View>
                    <ChevronRight size={20} color="#CBD5E1" />
                </View>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Ou selecione por categoria</Text>

            <View style={styles.gridContainer}>
                {baseCategories.map((cat) => (
                    <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.card, { width: cardWidth }]}
                        activeOpacity={0.7}
                        onPress={handleNavigateToSelection}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: cat.bgLight }]}>
                            <cat.icon size={24} color={cat.color} strokeWidth={2.5} />
                        </View>
                        
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>{cat.label}</Text>
                            <Text style={styles.cardDesc} numberOfLines={2}>{cat.description}</Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={styles.countBadge}>
                                <Text style={[styles.countText, { color: cat.color }]}>
                                    {countTables(cat.id)} Planos
                                </Text>
                            </View>
                            <ChevronRight size={16} color="#CBD5E1" />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, alignItems: 'center', width: '100%' },
  contentWrapper: { flex: 1, width: '100%' },
  scrollContent: { padding: PADDING_HORIZONTAL, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontFamily: 'Montserrat-Bold', fontWeight: '900', color: '#1E3A8A' },
  logoBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  groupsButton: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#64748B', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  groupsButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupsIconBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  groupsTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  groupsSubtitle: { fontSize: 12, color: '#64748B' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 16, marginLeft: 4 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#64748B', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3 },
  iconContainer: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardContent: { marginBottom: 16, minHeight: 40 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  cardDesc: { fontSize: 11, color: '#64748B', lineHeight: 15 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  countText: { fontSize: 10, fontWeight: '700' }
});