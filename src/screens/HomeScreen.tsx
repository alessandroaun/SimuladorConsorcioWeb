import React, { useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, 
  StatusBar, ScrollView, Image, Linking, useWindowDimensions 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  Car, Home as HomeIcon, Bike, Wrench, ChevronRight, 
  LayoutGrid, BarChart3
} from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';

import { Category, TableMetadata } from '../../data/TableRepository'; 

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface BaseCategory {
    id: Category;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;      // Cor principal (ícone/texto)
    bgLight: string;    // Cor de fundo suave (bolha do ícone)
}

// URL do PowerBI (Link externo)
const POWERBI_URL = "https://app.powerbi.com/view?r=eyJrIjoiNmJlOTI0ZTYtY2UwNi00NmZmLWE1NzQtNjUwNjUxZTk3Nzg0IiwidCI6ImFkMjI2N2U3LWI4ZTctNDM4Ni05NmFmLTcxZGVhZGQwODY3YiJ9";

export default function HomeScreen({ navigation, route }: Props) {
  // --- RESPONSIVIDADE (PADRÃO RESULT SCREEN) ---
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Definições de Layout
  const MAX_WIDTH = 960;
  const GAP = 12;
  const PADDING_HORIZONTAL = isDesktop ? 40 : 24;

  // 1. Largura do container (Limitada a 960px no Desktop)
  const containerWidth = Math.min(windowWidth, MAX_WIDTH);
  
  // 2. Largura disponível interna (Container - Paddings)
  const availableWidth = containerWidth - (PADDING_HORIZONTAL * 2);
  
  // 3. Largura exata do Card para 2 colunas
  const cardWidth = (availableWidth - GAP) / 2;
  
  // Configuração visual das categorias com paleta moderna
  const baseCategories: BaseCategory[] = [
    { 
      id: 'AUTO', 
      label: 'Automóvel', 
      description: 'Carros ou caminhões novos e seminovos',
      icon: Car, 
      color: '#2563EB', // Blue 600
      bgLight: '#EFF6FF' // Blue 50
    },
    { 
      id: 'IMOVEL', 
      label: 'Imóvel', 
      description: 'Casas, apartamentos, terrenos e etc',
      icon: HomeIcon, 
      color: '#059669', // Emerald 600
      bgLight: '#ECFDF5' // Emerald 50
    },
    { 
      id: 'MOTO', 
      label: 'Motocicleta', 
      description: 'Motos de todas as cilindradas',
      icon: Bike, 
      color: '#D97706', // Amber 600
      bgLight: '#FFFBEB' // Amber 50
    },
    { 
      id: 'SERVICOS', 
      label: 'Serviços', 
      description: 'Cirurgias, viagens, festas, estudos e etc',
      icon: Wrench, 
      color: '#7C3AED', // Violet 600
      bgLight: '#F5F3FF' // Violet 50
    },
  ];

  const allTables: TableMetadata[] = route.params?.tables || [];

  const displayCategories = useMemo(() => {
    const availableCategories = new Set(allTables.map(t => t.category));
    return baseCategories.filter(cat => availableCategories.has(cat.id));
  }, [allTables]);

  const handleNavigateToSelection = (categoryId: Category) => {
    const tablesForCategory = allTables.filter(t => t.category === categoryId);
    navigation.navigate('TableSelection', { 
      category: categoryId, 
      tables: tablesForCategory 
    });
  };

  const countTables = (catId: Category) => allTables.filter(t => t.category === catId).length;

  // Função para abrir o Power BI no navegador externo
  const handleOpenPowerBI = async () => {
    try {
      const supported = await Linking.canOpenURL(POWERBI_URL);
      if (supported) {
        await Linking.openURL(POWERBI_URL);
      } else {
        console.error("Não é possível abrir a URL: " + POWERBI_URL);
      }
    } catch (err) {
      console.error("Erro ao tentar abrir URL:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <ScrollView 
        contentContainerStyle={[
            styles.scrollContent, 
            { 
                // RESPONSIVIDADE: Limita a largura, centraliza e aplica padding dinâmico
                width: '100%',
                maxWidth: MAX_WIDTH,
                alignSelf: 'center',
                paddingHorizontal: PADDING_HORIZONTAL,
            }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* LOGOMARCA RECON */}
        <View style={styles.logoContainer}>
            <Image 
                source={require('../../assets/logo_recon.png')} 
                style={styles.logo}
                resizeMode="contain"
            />
        </View>

        {/* CABEÇALHO MODERNO */}
        <View style={styles.header}>
          
          <View style={styles.headerTopRow}>
              <View style={{flex: 1}}>
                  <Text style={styles.title}>
                    O que você deseja{'\n'}
                    <Text style={styles.titleHighlight}>simular hoje?</Text>
                  </Text>
              </View>

              {/* BOTÃO POWER BI (Abre no navegador) */}
              <TouchableOpacity 
                style={styles.powerBiMiniButton} 
                onPress={handleOpenPowerBI}
                activeOpacity={0.7}
              >
                 <BarChart3 color="#D97706" size={14} />
                 <Text style={styles.powerBiMiniText}>Relação de Grupos</Text>
              </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Selecione uma categoria abaixo para iniciar sua simulação personalizada.
          </Text>

        </View>
        
        {/* GRID DE CATEGORIAS */}
        <View style={[styles.grid, { gap: GAP }]}>
          {displayCategories.map((cat) => {
            const tableCount = countTables(cat.id);
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                    styles.card,
                    { width: cardWidth } // LARGURA DINÂMICA
                ]}
                activeOpacity={0.7}
                onPress={() => handleNavigateToSelection(cat.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: cat.bgLight }]}>
                    <cat.icon color={cat.color} size={28} strokeWidth={2} />
                  </View>
                  <View style={[styles.countBadge, { borderColor: cat.bgLight }]}>
                    <Text style={[styles.countText, { color: cat.color }]}>{tableCount}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{cat.label}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{cat.description}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.actionText, { color: cat.color }]}>Simular</Text>
                  <ChevronRight size={16} color={cat.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* ESTADO VAZIO (Fallback) */}
        {displayCategories.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <LayoutGrid size={32} color="#94A3B8" />
            </View>
            <Text style={styles.emptyText}>Nenhuma tabela carregada</Text>
            <Text style={styles.emptySubText}>
              Não conseguimos carregar as tabelas do servidor. Verifique sua conexão.
            </Text>
          </View>
        )}

        <Text style={styles.footerVersion}>VERSÃO DE TESTES - SIMULADOR RECON</Text>
        <Text style={styles.footerVersion}>Desenvolvido por Alessandro Uchoa</Text>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' // Slate 50
  },
  scrollContent: {
    // paddingHorizontal movido para inline styles dinâmicos
    paddingVertical: 24,
    paddingBottom: 40,
  },
  
  // LOGO
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logo: {
    width: 200,
    height: 100,
  },

  // HEADER
  header: { 
    marginBottom: 32,
    marginTop: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '400', 
    color: '#0F172A', // Slate 900
    lineHeight: 36,
  },
  titleHighlight: {
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: { 
    fontSize: 15, 
    color: '#64748B', // Slate 500
    lineHeight: 22,
    maxWidth: '90%',
  },

  // POWER BI MINI BUTTON (Novo Estilo)
  powerBiMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED', // Amber 50
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D', // Amber 300
    marginLeft: 12,
    marginTop: 4, // Alinha levemente com o topo do texto
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  powerBiMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706', // Amber 600
    marginLeft: 6,
  },

  // GRID
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    // Usamos 'flex-start' para garantir que preencham da esquerda pra direita
    justifyContent: 'flex-start', 
    // gap: GAP // Removido daqui e passado inline para consistência
  },
  
  // CARD
  card: { 
    // width: CARD_WIDTH, // Removido daqui e passado inline
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    // Sombras suaves (iOS & Android)
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9', // Borda sutil
    marginBottom: 8
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  countText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 16
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#1E293B',
    marginBottom: 4
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // EMPTY STATE
  emptyState: { 
    padding: 40, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyText: { 
    fontSize: 18, 
    color: '#0F172A', 
    fontWeight: 'bold' 
  },
  emptySubText: { 
    fontSize: 14, 
    color: '#64748B', 
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20
  },
  footerVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    paddingTop: 1,
    marginTop: 10
  },
});