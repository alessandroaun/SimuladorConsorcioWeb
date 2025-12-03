import React, { useMemo, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, 
  StatusBar, ScrollView, Image, Linking, useWindowDimensions,
  BackHandler, Alert
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
  // --- RESPONSIVIDADE ---
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const isSmallMobile = windowWidth < 380; // Detecta telas muito pequenas

  // Definições de Layout
  const MAX_WIDTH = 960;
  const GAP = 12; // Espaço entre os cards
  
  // Padding lateral dinâmico
  const paddingHorizontal = isDesktop ? 32 : (isSmallMobile ? 16 : 24);

  // 1. Largura do container (Limitada a 960px no Desktop)
  const contentWidth = Math.min(windowWidth, MAX_WIDTH);
  
  // 2. Largura disponível interna (Container - Paddings - Gaps)
  const availableWidth = contentWidth - (paddingHorizontal * 2) - GAP;
  
  // 3. Largura exata do Card para 2 colunas
  const cardWidth = Math.floor(availableWidth / 2);
  
  // Configuração visual das categorias
  const baseCategories: BaseCategory[] = [
    { 
      id: 'AUTO', 
      label: 'Automóvel', 
      description: 'Novos e seminovos',
      icon: Car, 
      color: '#2563EB', // Blue 600
      bgLight: '#EFF6FF' // Blue 50
    },
    { 
      id: 'IMOVEL', 
      label: 'Imóvel', 
      description: 'Casas, aptos e terrenos',
      icon: HomeIcon, 
      color: '#059669', // Emerald 600
      bgLight: '#ECFDF5' // Emerald 50
    },
    { 
      id: 'MOTO', 
      label: 'Motocicleta', 
      description: 'Todas as cilindradas',
      icon: Bike, 
      color: '#D97706', // Amber 600
      bgLight: '#FFFBEB' // Amber 50
    },
    { 
      id: 'SERVICOS', 
      label: 'Serviços', 
      description: 'Cirurgias, festas e etc',
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

  // --- LÓGICA DO BOTÃO VOLTAR (ANDROID) ---
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Sair do Aplicativo",
        "Tem certeza que deseja sair?",
        [
          {
            text: "Cancelar",
            onPress: () => null,
            style: "cancel"
          },
          { text: "SIM", onPress: () => BackHandler.exitApp() }
        ]
      );
      return true; // Impede o comportamento padrão (fechar imediatamente)
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* ScrollView principal */}
      <ScrollView 
        contentContainerStyle={[
            styles.scrollContent, 
            { 
                width: contentWidth,
                alignSelf: 'center',
                paddingHorizontal: paddingHorizontal,
            }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* LOGO CENTRAL (Espaçamento reduzido) */}
        <View style={styles.logoContainer}>
            <Image 
                source={require('../../assets/logo_recon.png')} 
                style={styles.logo}
                resizeMode="contain"
            />
        </View>

        {/* TÍTULO DA PÁGINA COM BOTÃO AO LADO */}
        <View style={styles.pageTitleContainer}>
            <View style={styles.titleRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.title}>
                    O que você deseja{'\n'}
                    <Text style={styles.titleHighlight}>simular hoje?</Text>
                    </Text>
                </View>

                {/* Botão Relação de Grupos (Reposicionado aqui) */}
                <TouchableOpacity 
                    onPress={handleOpenPowerBI} 
                    style={[styles.navBtn, {backgroundColor: '#FEF3C7', paddingHorizontal: 10, maxWidth: 140}]} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <BarChart3 color="#D97706" size={16} />
                    <Text style={styles.navBtnText}>Relação de Grupos</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Selecione uma categoria abaixo para iniciar.
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
                    { width: cardWidth } 
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
                  <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>{cat.label}</Text>
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

        <View style={styles.footerContainer}>
            <Text style={styles.footerVersion}>VERSÃO DE TESTES - SIMULADOR RECON</Text>
            <Text style={styles.footerVersion}>Desenvolvido por Alessandro Uchoa</Text>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' // Slate 50
  },
  
  // Botão reutilizado (agora ao lado do título)
  navBtn: { 
    height: 38,
    backgroundColor: '#F1F5F9', 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 4
  },
  navBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 6,
    flexShrink: 1, // Permite que o texto encolha se necessário
    textAlign: 'center'
  },

  // --- SCROLL CONTENT ---
  scrollContent: {
    paddingTop: 12, // Reduzido de 24 para economizar espaço no topo
    paddingBottom: 40,
  },

  // --- LOGO (Espaços Reduzidos) ---
  logoContainer: {
    alignItems: 'center',
    marginBottom: 4, // Reduzido drasticamente de 20 para 4
    marginTop: 0,
  },
  logo: {
    width: 200,
    height: 100, // Altura mantida, mas margens externas reduzidas
  },
  
  // --- PAGE TITLE ---
  pageTitleContainer: {
    marginBottom: 12, // Reduzido de 24 para 12
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { 
    fontSize: 24, // Leve ajuste para caber melhor com o botão
    fontWeight: '400', 
    color: '#0F172A', 
    lineHeight: 30,
  },
  titleHighlight: {
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: { 
    fontSize: 14, 
    color: '#64748B', 
    lineHeight: 20,
    marginTop: 6,
    maxWidth: '100%',
  },

  // --- GRID ---
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  
  // --- CARD (Estilos Originais) ---
  card: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16, 
    justifyContent: 'space-between',
    // Sombras
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    minHeight: 160 
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

  // --- EMPTY STATE ---
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
  
  // --- FOOTER ---
  footerContainer: {
    marginTop: 20,
    alignItems: 'center'
  },
  footerVersion: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2
  },
});