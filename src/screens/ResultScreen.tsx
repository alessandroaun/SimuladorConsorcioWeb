import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, 
  Platform, StatusBar, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Linking, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  ArrowLeft, Share2, CheckCircle2, Car, CalendarClock, AlertTriangle, 
  Ban, DollarSign, Calendar, FileText, Info, RefreshCw, TrendingDown,
  User, Phone, Briefcase, X, FileOutput, Wallet, PieChart, ChevronRight,
  BarChart3, Globe, Users, Database, Percent, Target, Trophy, Award, TrendingUp
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// CORREÇÃO PARA WEB EXPORT:
// Substituímos o import direto do 'expo-file-system/legacy' pelo nosso Proxy.
import FileSystem from '../utils/FileSystemProxy';

import { RootStackParamList } from '../types/navigation';
import { ContemplationScenario } from '../utils/ConsortiumCalculator';
import { generateHTML } from '../utils/GeneratePDFHtml';
import { TABLES_METADATA } from '../../data/TableRepository';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

type ScenarioMode = 'REDUZIDO' | 'CHEIO';

// URL do PowerBI fornecido
const POWERBI_URL = "https://app.powerbi.com/view?r=eyJrIjoiNmJlOTI0ZTYtY2UwNi00NmZmLWE1NzQtNjUwNjUxZTk3Nzg0IiwidCI6ImFkMjI2N2U3LWI4ZTctNDM4Ni05NmFmLTcxZGVhZGQwODY3YiJ9";

// URL para o JSON de Grupos (Dados Gerais)
const GROUPS_DATA_URL = "https://raw.githubusercontent.com/alessandroaun/Json-Recon/refs/heads/master/banco_recon/relacao_grupos.json";

// URL para o JSON de Estatísticas (Dados de Contemplação)
const GROUPS_STATS_URL = "https://raw.githubusercontent.com/alessandroaun/Json-Recon/refs/heads/master/banco_recon/estatisticas_grupos.json";

export default function ResultScreen({ route, navigation }: Props) {
  // Hook para dimensões responsivas
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const isSmallMobile = windowWidth < 380;
    
  // --- LAYOUT RESPONSIVO ---
  const MAX_WIDTH = 960;
  const contentWidth = Math.min(windowWidth, MAX_WIDTH);
  const paddingHorizontal = isDesktop ? 32 : 24;

  const { result, input, quotaCount = 1 } = route.params;
    
  // Tenta recuperar selectedCredits do params ou do input
  const paramsAny = route.params as any;
  const selectedCredits = paramsAny.selectedCredits || (input as any).selectedCredits as number[] | undefined;
    
  const isCaminho1Viable = result.cenarioCreditoReduzido !== null;
  const [mode, setMode] = useState<ScenarioMode>(isCaminho1Viable ? 'REDUZIDO' : 'CHEIO');

  const currentTable = TABLES_METADATA.find(t => t.id === input.tableId);

  // Estados para o Modal de PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfClient, setPdfClient] = useState('');
  const [pdfClientPhone, setPdfClientPhone] = useState(''); 
  const [pdfSeller, setPdfSeller] = useState(''); 
  const [pdfSellerPhone, setPdfSellerPhone] = useState(''); 

  // Estados para Grupos Online
  const [groupsData, setGroupsData] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any[]>([]); 
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  
  // Estado para Grupo Selecionado (Modal de Detalhes)
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const isSpecialPlan = result.plano === 'LIGHT' || result.plano === 'SUPERLIGHT';
  const fatorPlano = result.plano === 'LIGHT' ? 0.75 : result.plano === 'SUPERLIGHT' ? 0.50 : 1.0;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const timeStamp = new Date().getTime();
        const groupsUrl = `${GROUPS_DATA_URL}?t=${timeStamp}`;
        const statsUrl = `${GROUPS_STATS_URL}?t=${timeStamp}`;

        console.log("Buscando dados...");
        
        const [groupsResponse, statsResponse] = await Promise.all([
            fetch(groupsUrl),
            fetch(statsUrl)
        ]);

        if (groupsResponse.ok) {
          const data = await groupsResponse.json();
          setGroupsData(data);
        } else {
          console.warn("Falha ao baixar grupos:", groupsResponse.status);
        }

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            setStatsData(stats);
        } else {
            console.warn("Falha ao baixar estatísticas (pode não existir ainda):", statsResponse.status);
        }

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchAllData();
  }, []);

  // --- NOVA LÓGICA DE GRUPOS COMPATÍVEIS ---
  const compatibleGroupsMap = useMemo(() => {
    if (isLoadingGroups || groupsData.length === 0 || !currentTable) return [];

    const categoryMap: Record<string, string> = {
      'AUTO': 'VEÍCULO',
      'MOTO': 'VEÍCULO',
      'IMOVEL': 'IMÓVEL',
      'SERVICOS': 'SERVIÇO'
    };

    const targetType = categoryMap[currentTable.category];

    let creditsToAnalyze: number[] = [];

    if (selectedCredits && Array.isArray(selectedCredits) && selectedCredits.length > 0) {
        creditsToAnalyze = selectedCredits;
    } else {
        const individualCredit = quotaCount > 1 ? result.creditoOriginal / quotaCount : result.creditoOriginal;
        creditsToAnalyze = [individualCredit];
    }

    const uniqueCredits = [...new Set(creditsToAnalyze)].sort((a, b) => b - a);

    return uniqueCredits.map(creditVal => {
        const groups = groupsData.filter((group: any) => {
             if (group.TIPO !== targetType) return false;
             if (input.prazo > group["Prazo Máximo"]) return false;

             const rangeString = group["Créditos Disponíveis"];
             if (!rangeString) return false;

             const rangeParts = rangeString.replace(/\./g, '').split(' até ');
             if (rangeParts.length !== 2) return false;
             
             const minCredit = parseFloat(rangeParts[0]);
             const maxCredit = parseFloat(rangeParts[1]);

             if (creditVal < minCredit || creditVal > maxCredit) return false;

             const groupName = String(group.Grupo);

             // Regra para Grupo 2011 (Imóvel Longo Prazo)
             if (groupName === '2011') {
                if (input.prazo <= 200 || creditVal < 200000) {
                    return false;
                }
             }

             // Regra para Grupo 5121
             if (groupName === '5121') {
                  if (input.prazo <= 100 || creditVal < 80000) {
                      return false;
                  }
             }

             return true;
        }).map((g: any) => g.Grupo);

        return {
            creditValue: creditVal,
            groups: groups
        };
    });

  }, [input.tableId, input.prazo, result.creditoOriginal, groupsData, isLoadingGroups, quotaCount, currentTable, selectedCredits]);

  // Função para lidar com o clique no grupo
  const handleGroupPress = (groupName: string) => {
    // 1. Encontra os dados gerais
    const groupDetails = groupsData.find((g: any) => String(g.Grupo) === String(groupName));
    
    // 2. Encontra as estatísticas correspondentes
    const groupStats = statsData.find((s: any) => String(s.Grupo) === String(groupName));

    if (groupDetails) {
        // 3. Mescla os dados para uso no modal
        setSelectedGroup({
            ...groupDetails,
            ...groupStats // Adiciona os campos do JSON de estatísticas se existirem
        });
    }
  };

  // --- HELPER PARA ANÁLISE DE LANCE ---
  const getBidAnalysis = (group: any) => {
    if (!group) return null;

    const userBidPct = (result.lanceTotal / result.creditoOriginal) * 100;
    
    // Parse values from JSON (handle string numbers with commas or dots)
    const parseValue = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            return parseFloat(val.replace(',', '.').replace('%', ''));
        }
        return 0;
    };

    const minBid = parseValue(group['Menor Lance Livre']);
    const avgBid = parseValue(group['Media Lance Livre']);

    let status: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    let message = '';

    if (avgBid > 0 && userBidPct >= avgBid) {
        status = 'high';
        message = 'Seu lance supera a média da última assembleia! Excelentes chances.';
    } else if (minBid > 0 && userBidPct >= minBid) {
        status = 'medium';
        message = 'Lance competitivo. Você está acima do lance mínimo contemplado.';
    } else if (minBid > 0 && userBidPct < minBid) {
        status = 'low';
        message = 'Atenção: Seu lance está abaixo do mínimo contemplado na última assembleia.';
    } else {
        status = 'unknown';
        message = 'Dados insuficientes para comparação precisa.';
    }

    return { userBidPct, minBid, avgBid, status, message };
  };


  const handleOpenPdfModal = () => {
    setShowPdfModal(true);
  }

  // --- FUNÇÃO DE GERAR PDF COM RENOMEAÇÃO ---
  const handleGeneratePDF = async () => {
    setShowPdfModal(false);

    try {
      const html = generateHTML(
        result, 
        input, 
        mode, 
        {
          cliente: pdfClient,
          telefoneCliente: pdfClientPhone,
          vendedor: pdfSeller,
          telefoneVendedor: pdfSellerPhone 
        },
        quotaCount
      );
        
      if (Platform.OS === 'web') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
          } else {
              Alert.alert("Atenção", "Por favor, permita pop-ups para gerar o PDF.");
          }
          return; 
      }

      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false 
      });
        
      const nomeClienteLimpo = pdfClient 
        ? pdfClient.trim().replace(/[^a-zA-Z0-9À-ÿ]/g, '_') 
        : 'Cliente';
        
      const valorTotalCredito = quotaCount > 1 ? result.creditoOriginal : (result.creditoOriginal * quotaCount);
      const valorFormatado = valorTotalCredito.toLocaleString('pt-BR', { minimumFractionDigits: 0 });

      const fileName = `Simulacao_${nomeClienteLimpo}_R$${valorFormatado}.pdf`;
        
      const fs = FileSystem;
        
      let targetDirectory = fs.documentDirectory || fs.cacheDirectory;

      if (!targetDirectory && uri) {
        const lastSlashIndex = uri.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            targetDirectory = uri.substring(0, lastSlashIndex + 1);
        }
      }

      let finalUri = uri; 

      if (targetDirectory && fs.moveAsync) {
        try {
            const dirPath = targetDirectory.endsWith('/') ? targetDirectory : targetDirectory + '/';
            const newUri = dirPath + fileName;
            
            await fs.moveAsync({
                from: uri,
                to: newUri
            });
            finalUri = newUri;
        } catch (moveError) {
            console.warn("Erro ao renomear arquivo (fallback para original):", moveError);
        }
      }

      if (Platform.OS === "ios" || Platform.OS === "android") {
          await Sharing.shareAsync(finalUri, { 
            UTI: '.pdf', 
            mimeType: 'application/pdf',
            dialogTitle: `Compartilhar Simulação - ${pdfClient}`
          });
      } else {
          Alert.alert("Sucesso", "PDF gerado.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    }
  };

  const handleOpenPowerBI = async () => {
    try {
      const supported = await Linking.canOpenURL(POWERBI_URL);
      if (supported) {
        await Linking.openURL(POWERBI_URL);
      } else {
        console.error("Não é possível abrir a URL: " + POWERBI_URL);
        Alert.alert("Erro", "Não foi possível abrir o link.");
      }
    } catch (err) {
      console.error("Erro ao tentar abrir URL:", err);
    }
  };

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
  let activeScenario: ContemplationScenario[];
  let creditoExibido: number;
  let isReajustado = false;

  if (isSpecialPlan && result.cenarioCreditoTotal) { 
      if (mode === 'REDUZIDO' && isCaminho1Viable && result.cenarioCreditoReduzido) {
          activeScenario = result.cenarioCreditoReduzido;
          creditoExibido = activeScenario[0].creditoEfetivo;
      } else {
          activeScenario = result.cenarioCreditoTotal;
          creditoExibido = activeScenario[0].creditoEfetivo;
          isReajustado = true;
      }
  } else {
      activeScenario = result.cenariosContemplacao;
      creditoExibido = result.creditoLiquido;
  }

  const cenarioPrincipal = activeScenario && activeScenario.length > 0 ? activeScenario[0] : null;
  const lanceEmbutidoValor = result.lanceTotal - input.lanceBolso - result.lanceCartaVal;

  const mesContemplacaoRef = Math.max(1, input.mesContemplacao);
  const prazoRestanteOriginal = Math.max(0, input.prazo - mesContemplacaoRef);
  const mesesAbatidosCalc = cenarioPrincipal ? Math.max(0, prazoRestanteOriginal - cenarioPrincipal.novoPrazo) : 0;

  const safeCenario = cenarioPrincipal as any; 
  const reducaoValor = safeCenario?.reducaoValor ?? 0;
  const reducaoPorcentagem = safeCenario?.reducaoPorcentagem ?? 0;

  const totalSeguroNoPrazo = result.seguroMensal * input.prazo;
  const valorReducaoCreditoBase = (isSpecialPlan && mode === 'REDUZIDO') 
    ? (result.creditoOriginal * (1 - fatorPlano)) 
    : 0;

  let custoTotalExibido = 
      result.creditoOriginal + 
      result.taxaAdminValor + 
      result.fundoReservaValor + 
      totalSeguroNoPrazo + 
      result.valorAdesao - 
      lanceEmbutidoValor - 
      result.lanceCartaVal - 
      valorReducaoCreditoBase;

  // Calculo de análise para o modal se um grupo estiver selecionado
  const analysis = useMemo(() => selectedGroup ? getBidAnalysis(selectedGroup) : null, [selectedGroup, result.lanceTotal]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
      {/* HEADER RESPONSIVO PADRONIZADO */}
      <View style={styles.headerWrapper}>
        <View style={[styles.headerContent, { width: contentWidth, paddingHorizontal }]}>
            <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backBtn} 
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <ArrowLeft color="#0F172A" size={24} />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Resultado</Text>
            
            <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity 
                    onPress={handleOpenPowerBI} 
                    style={[styles.navBtn, {backgroundColor: '#FEF3C7'}]} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <BarChart3 color="#D97706" size={20} />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={handleOpenPdfModal} 
                    style={[styles.navBtn, {backgroundColor: '#334155'}]} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Share2 color="#fff" size={18} />
                    {!isSmallMobile && isDesktop && (
                        <Text style={[styles.actionButtonText, {marginLeft: 8}]}>COMPARTILHAR</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[
            styles.scrollContent,
            { 
              width: contentWidth, 
              alignSelf: 'center', 
              paddingHorizontal: paddingHorizontal
            }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* HERO CARD */}
        <View style={styles.heroContainer}>
            <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                    <View>
                        <Text style={styles.heroLabel}>PARCELA INICIAL</Text>
                        <Text style={styles.heroValue}>{formatBRL(result.totalPrimeiraParcela)}</Text>
                    </View>
                    <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{result.plano}</Text>
                    </View>
                </View>

                <View style={styles.heroDivider} />

                <View style={styles.heroBottomRow}>
                    {result.valorAdesao > 0 ? (
                        <View style={styles.heroDetailItem}>
                            <CheckCircle2 color="#4ADE80" size={14} style={{marginRight: 6}} />
                            <Text style={styles.heroDetailText}>
                                Parcela {formatBRL(result.parcelaPreContemplacao)} + Adesão {formatBRL(result.valorAdesao)}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.heroDetailText}>Pagamento referente à primeira mensalidade.</Text>
                    )}
                </View>
            </View>
            <View style={styles.heroCardLayer1} />
            <View style={styles.heroCardLayer2} />
        </View>

        {/* SELETOR DE CAMINHO */}
        {isSpecialPlan && (
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Cenário Pós-Contemplação</Text>
                    <Info size={16} color="#94A3B8" />
                </View>

                {!isCaminho1Viable && (
                   <View style={styles.errorBanner}>
                      <Ban color="#EF4444" size={16} />
                      <Text style={styles.errorText}>
                        Opção de Crédito Reduzido indisponível para esta configuração.
                      </Text>
                   </View>
                )}

                <View style={styles.switchContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.switchButton, 
                            mode === 'REDUZIDO' && styles.switchActive,
                            !isCaminho1Viable && styles.switchDisabled
                        ]}
                        onPress={() => isCaminho1Viable && setMode('REDUZIDO')}
                        disabled={!isCaminho1Viable}
                        activeOpacity={0.9}
                    >
                        <Text style={[
                            styles.switchText, 
                            mode === 'REDUZIDO' ? styles.switchTextActive : styles.switchTextInactive
                        ]}>
                            Crédito Reduzido ({fatorPlano*100}%)
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.switchButton, mode === 'CHEIO' && styles.switchActive]}
                        onPress={() => setMode('CHEIO')}
                        activeOpacity={0.9}
                    >
                        <Text style={[styles.switchText, mode === 'CHEIO' ? styles.switchTextActive : styles.switchTextInactive]}>
                            Crédito Cheio (100%)
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.helperText}>
                    {mode === 'REDUZIDO' 
                        ? `Mantém a parcela original. O crédito é ajustado proporcionalmente.`
                        : `Recebe o crédito total. A parcela é reajustada para cobrir a diferença.`
                    }
                </Text>
            </View>
        )}

        {/* CARDS DE MÉTRICAS */}
        <View style={styles.gridContainer}>
          <View style={styles.gridCard}>
            <View style={styles.gridHeader}>
                <View style={[styles.iconCircle, {backgroundColor: '#EFF6FF'}]}>
                    <DollarSign color="#3B82F6" size={20} />
                </View>
            </View>
            <View style={styles.gridContent}>
                <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
                    {isSpecialPlan ? `Crédito Base` : 'Crédito SIMULADO'}
                </Text>
                <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatBRL(mode === 'REDUZIDO' && isSpecialPlan ? result.creditoOriginal * fatorPlano : result.creditoOriginal)}
                </Text>
            </View>
          </View>

          <View style={styles.gridCard}>
            <View style={styles.gridHeader}>
                <View style={[styles.iconCircle, {backgroundColor: '#F0FDF4'}]}>
                    <Calendar color="#16A34A" size={20} />
                </View>
            </View>
            <View style={styles.gridContent}>
                <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>Prazo Total</Text>
                <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>{input.prazo} meses</Text>
            </View>
          </View>
        </View>

        {/* ANÁLISE DE LANCES */}
        {result.lanceTotal > 0 && (
          <View style={styles.contentCard}>
            <View style={styles.cardHeaderRow}>
                 <Text style={styles.cardTitle}>Composição do Lance</Text>
                 <View style={styles.percentBadge}>
                    <Text style={styles.percentText}>{((result.lanceTotal / result.creditoOriginal) * 100).toFixed(2)}%</Text>
                 </View>
            </View>
            
            <View style={styles.lanceList}>
                <View style={styles.lanceRow}>
                    <View style={styles.lanceRowLeft}>
                        <View style={[styles.miniIcon, {backgroundColor: '#F1F5F9'}]}>
                             <Wallet size={14} color="#64748B" />
                        </View>
                        <Text style={styles.lanceRowLabel}>Recursos Próprios</Text>
                    </View>
                    <Text style={styles.lanceRowValue}>{formatBRL(input.lanceBolso)}</Text>
                </View>

                {lanceEmbutidoValor > 0 && (
                    <View style={styles.lanceRow}>
                        <View style={styles.lanceRowLeft}>
                            <View style={[styles.miniIcon, {backgroundColor: '#FFF7ED'}]}>
                                <PieChart size={14} color="#EA580C" />
                            </View>
                            <Text style={styles.lanceRowLabel}>Lance Embutido</Text>
                        </View>
                        <Text style={styles.lanceRowValue}>{formatBRL(lanceEmbutidoValor)}</Text>
                    </View>
                )}

                {result.lanceCartaVal > 0 && (
                    <View style={styles.lanceRow}>
                        <View style={styles.lanceRowLeft}>
                            <View style={[styles.miniIcon, {backgroundColor: '#F0F9FF'}]}>
                                <Car size={14} color="#0284C7" />
                            </View>
                            <Text style={styles.lanceRowLabel}>Carta Avaliação</Text>
                        </View>
                        <Text style={styles.lanceRowValue}>{formatBRL(result.lanceCartaVal)}</Text>
                    </View>
                )}

                <View style={styles.dashDivider} />

                <View style={styles.totalLanceRow}>
                    <Text style={styles.totalLanceLabel}>Total Ofertado</Text>
                    <Text style={styles.totalLanceValue}>{formatBRL(result.lanceTotal)}</Text>
                </View>
            </View>

            {/* CRÉDITO LÍQUIDO */}
            <View style={styles.featuredBox}>
                <Text style={styles.featuredValue}>{formatBRL(creditoExibido)}</Text>
                <Text style={styles.featuredLabel}>CRÉDITO LÍQUIDO</Text>
                <Text style={styles.featuredSub}>Disponível para compra do bem</Text>
            </View>

             {result.lanceCartaVal > 0 && (
                <View style={styles.infoFooter}>
                    <Text style={styles.infoFooterText}>
                        Poder de Compra Total: <Text style={{fontWeight: '700', color: '#0F172A'}}>{formatBRL(creditoExibido + result.lanceCartaVal)}</Text>
                    </Text>
                </View>
            )}
          </View>
        )}

        {/* DETALHAMENTO FINANCEIRO */}
        <View style={styles.contentCard}>
            <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Custos e Taxas</Text>
                <FileText color="#94A3B8" size={18} />
            </View>

            <View style={styles.costList}>
                <View style={styles.costItem}>
                    <Text style={styles.costLabel}>
                        Taxa Adm. Total ({currentTable ? (currentTable.taxaAdmin * 100).toFixed(0) : 0}%)
                    </Text>
                    <View style={styles.costDots} />
                    <Text style={styles.costValue}>{formatBRL(result.taxaAdminValor)}</Text>
                </View>
                <View style={styles.costItem}>
                    <Text style={styles.costLabel}>
                        Fundo Reserva ({currentTable ? (currentTable.fundoReserva * 100).toFixed(0) : 0}%)
                    </Text>
                    <View style={styles.costDots} />
                    <Text style={styles.costValue}>{formatBRL(result.fundoReservaValor)}</Text>
                </View>
                <View style={styles.costItem}>
                    <Text style={styles.costLabel}>
                        Seguro Mensal ({currentTable ? (currentTable.seguroPct * 100).toFixed(3).replace('.', ',') : '0,0000'}% a.m)
                    </Text>
                    <View style={styles.costDots} />
                    <Text style={styles.costValue}>{formatBRL(totalSeguroNoPrazo)}</Text>
                </View>
                <View style={styles.costItem}>
                    <Text style={styles.costLabel}>
                        Taxa de Adesão ({input.taxaAdesaoPct ? (input.taxaAdesaoPct * 100).toFixed(1).replace('.0', '') : 0}%)
                    </Text>
                    <View style={styles.costDots} />
                    <Text style={styles.costValue}>{formatBRL(result.valorAdesao)}</Text>
                </View>
            </View>

            <View style={styles.grandTotalBox}>
                <Text style={styles.grandTotalLabel}>Custo Total Estimado</Text>
                <Text style={styles.grandTotalValue}>{formatBRL(custoTotalExibido)}</Text>
            </View>
        </View>

        {/* GRUPOS COMPATÍVEIS (DINÂMICO PARA MÚLTIPLOS CRÉDITOS) */}
        {isLoadingGroups ? (
            <View style={[styles.contentCard, { padding: 30, alignItems: 'center' }]}>
               <ActivityIndicator size="small" color="#334155" />
               <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Buscando grupos atualizados...</Text>
            </View>
        ) : (
            <>
                {compatibleGroupsMap.length > 0 ? (
                    compatibleGroupsMap.map((item, index) => (
                        <View key={index} style={styles.contentCard}>
                            <View style={[styles.cardHeaderRow, { alignItems: 'flex-start' }]}>
                                <View>
                                    <Text style={styles.cardTitle}>Grupos Compatíveis</Text>
                                    <Text style={[styles.cardSubtitle, { marginTop: 4, color: '#1E293B', fontWeight: '600' }]}>
                                        Crédito de {formatBRL(item.creditValue)} // CLIQUE PARA DETALHES
                                    </Text>
                                </View>
                                <Users color="#94A3B8" size={18} style={{ marginTop: 4 }} />
                            </View>
                            
                            <View style={styles.badgesContainer}>
                                {item.groups.length > 0 ? (
                                    item.groups.map((grupo: string) => (
                                        <TouchableOpacity 
                                            key={grupo} 
                                            style={styles.groupBadge}
                                            onPress={() => handleGroupPress(grupo)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.groupBadgeText}>{grupo}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noGroupsText}>Nenhum grupo encontrado para este valor específico.</Text>
                                )}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.contentCard}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Grupos Compatíveis</Text>
                            <Users color="#94A3B8" size={18} />
                        </View>
                        <Text style={styles.noGroupsText}>Nenhum grupo encontrado com estes parâmetros.</Text>
                    </View>
                )}
            </>
        )}

        {/* PREVISÃO PÓS-CONTEMPLAÇÃO */}
        {cenarioPrincipal && (
            <View style={styles.contentCard}>
                <View style={styles.cardHeaderRow}>
                    <View>
                        <Text style={styles.cardTitle}>Após Contemplação</Text>
                        <Text style={styles.cardSubtitle}>Previsão baseada no mês {cenarioPrincipal.mes}</Text>
                    </View>
                    <CalendarClock color="#94A3B8" size={20} />
                </View>

                {isReajustado && (
                    <View style={styles.infoBanner}>
                        <Info size={14} color="#0369A1" style={{marginTop: 2}} />
                        <Text style={styles.infoBannerText}>
                            Houve reajuste na parcela para compensar a diferença do Crédito Cheio.
                        </Text>
                    </View>
                )}
                
                {result.lanceTotal > 0 && (
                    <View style={styles.bigNumbersContainer}>
                        <View style={styles.bigNumberItem}>
                            <Text style={styles.bigNumberLabel}>Nova Parcela</Text>
                            <Text style={styles.bigNumberValue}>{formatBRL(cenarioPrincipal.novaParcela)}</Text>
                            {reducaoValor > 0 && (
                                <View style={styles.trendBadge}>
                                    <TrendingDown size={10} color="#15803D" />
                                    <Text style={styles.trendText}>
                                            -{formatBRL(reducaoValor)} ({reducaoPorcentagem.toFixed(1)}%)
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.verticalSep} />
                        <View style={styles.bigNumberItem}>
                            <Text style={styles.bigNumberLabel}>Meses Abatidos</Text>
                            <Text style={styles.bigNumberValue}>{mesesAbatidosCalc.toFixed(1)}x</Text>
                        </View>
                    </View>
                )}
                
                <View style={styles.modernTable}>
                    <View style={styles.tableHead}>
                        <Text style={[styles.th, {flex: 0.8}]}>Mês</Text>
                        <Text style={[styles.th, {flex: 2}]}>Parcela Prevista</Text>
                        <Text style={[styles.th, {flex: 1.5, textAlign: 'right'}]}>Prazo</Text>
                    </View>

                    {activeScenario.map((cenario, index) => (
                        <View key={cenario.mes} style={styles.tableRow}>
                            <Text style={[styles.td, {flex: 0.8, fontWeight: '600', color: '#64748B'}]}>{cenario.mes}º</Text>
                            <Text style={[styles.td, {flex: 2, fontWeight: '700', color: '#0F172A'}]}>
                                {formatBRL(cenario.novaParcela)}
                            </Text>
                            <Text style={[styles.td, {flex: 1.5, textAlign: 'right', color: '#64748B'}]}>
                                {Math.round(cenario.novoPrazo)}x
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        )}

        <TouchableOpacity 
            style={styles.resetButton} 
            onPress={() => navigation.popToTop()}
        >
            <RefreshCw color="#64748B" size={18} style={{marginRight: 8}} />
            <Text style={styles.resetButtonText}>Nova Simulação</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />

      </ScrollView>

      {/* MODAL DE DADOS PARA PDF */}
      <Modal 
        visible={showPdfModal} 
        animationType="fade" 
        transparent 
        onRequestClose={() => setShowPdfModal(false)}
      >
          <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalBackdrop}
          >
              <View style={[
                  styles.modalCard,
                  { 
                      width: isDesktop ? 500 : '100%', 
                      alignSelf: 'center',
                      maxHeight: isDesktop ? '90%' : undefined 
                  }
              ]}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Gerar Proposta</Text>
                      <TouchableOpacity onPress={() => setShowPdfModal(false)} style={styles.closeModalBtn}>
                          <X color="#64748B" size={24} />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={{maxHeight: 400}} showsVerticalScrollIndicator={false}>
                      <Text style={styles.modalSectionTitle}>Dados do Cliente</Text>
                      <View style={styles.formGroup}>
                          <View style={styles.inputContainer}>
                              <User size={18} color="#94A3B8" />
                              <TextInput 
                                  style={styles.modalInput} 
                                  placeholder="Nome do cliente"
                                  value={pdfClient}
                                  onChangeText={setPdfClient}
                                  placeholderTextColor="#94A3B8"
                              />
                          </View>
                          <View style={[styles.inputContainer, {marginTop: 10}]}>
                              <Phone size={18} color="#94A3B8" />
                              <TextInput 
                                  style={styles.modalInput} 
                                  placeholder="Telefone / WhatsApp"
                                  keyboardType="phone-pad"
                                  value={pdfClientPhone}
                                  onChangeText={setPdfClientPhone}
                                  placeholderTextColor="#94A3B8"
                              />
                          </View>
                      </View>

                      <Text style={styles.modalSectionTitle}>Dados do Vendedor</Text>
                      <View style={styles.formGroup}>
                            <View style={styles.inputContainer}>
                              <Briefcase size={18} color="#94A3B8" />
                              <TextInput 
                                  style={styles.modalInput} 
                                  placeholder="Seu nome"
                                  value={pdfSeller}
                                  onChangeText={setPdfSeller}
                                  placeholderTextColor="#94A3B8"
                              />
                          </View>
                          <View style={[styles.inputContainer, {marginTop: 10}]}>
                              <Phone size={18} color="#94A3B8" />
                              <TextInput 
                                  style={styles.modalInput} 
                                  placeholder="Seu telefone / whatsapp"
                                  keyboardType="phone-pad"
                                  value={pdfSellerPhone}
                                  onChangeText={setPdfSellerPhone}
                                  placeholderTextColor="#94A3B8"
                              />
                          </View>
                      </View>
                  </ScrollView>

                  <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePDF}>
                      <FileOutput color="#fff" size={20} style={{marginRight: 10}} />
                      <Text style={styles.generateButtonText}>GERAR DOCUMENTO</Text>
                  </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
      </Modal>
      
      {/* MODAL DE DETALHES DO GRUPO */}
      <Modal 
          visible={!!selectedGroup} 
          animationType="fade" 
          transparent 
          onRequestClose={() => setSelectedGroup(null)}
      >
          <View style={styles.groupModalBackdrop}>
               <View style={styles.groupModalCard}>
                   {/* Header do Modal */}
                   <View style={styles.groupModalHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                             <View style={styles.groupIconBg}>
                                 <Database size={24} color="#2563EB" />
                             </View>
                             <View>
                                 <Text style={styles.groupModalTitle}>Grupo {selectedGroup?.Grupo}</Text>
                                 <Text style={styles.groupModalSubtitle}>{selectedGroup?.TIPO} • {selectedGroup?.["Prazo Máximo"]} meses</Text>
                             </View>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedGroup(null)} style={styles.closeRoundBtn}>
                            <X color="#64748B" size={20} />
                        </TouchableOpacity>
                   </View>
                   
                   <ScrollView style={styles.groupModalScroll} showsVerticalScrollIndicator={false}>
                        {/* Seção de Análise do Lance (Se existir lance) */}
                        {analysis && analysis.status !== 'unknown' && (
                            <View style={[
                                styles.analysisCard, 
                                analysis.status === 'high' ? styles.analysisHigh : 
                                analysis.status === 'medium' ? styles.analysisMedium : styles.analysisLow
                            ]}>
                                <View style={styles.analysisHeader}>
                                    {analysis.status === 'high' ? <Trophy size={18} color="#15803D" /> :
                                     analysis.status === 'medium' ? <TrendingUp size={18} color="#B45309" /> :
                                     <AlertTriangle size={18} color="#B91C1C" />}
                                    <Text style={[
                                        styles.analysisTitle,
                                        analysis.status === 'high' ? {color: '#15803D'} :
                                        analysis.status === 'medium' ? {color: '#B45309'} : {color: '#B91C1C'}
                                    ]}>
                                        Análise do Seu Lance
                                    </Text>
                                </View>
                                
                                <View style={styles.analysisMetrics}>
                                    <View>
                                        <Text style={styles.analysisLabel}>Seu Lance</Text>
                                        <Text style={styles.analysisValue}>{analysis.userBidPct.toFixed(2)}%</Text>
                                    </View>
                                    <View style={styles.analysisSeparator} />
                                    <View>
                                        <Text style={styles.analysisLabel}>Média do Grupo</Text>
                                        <Text style={styles.analysisValue}>{analysis.avgBid.toFixed(2)}%</Text>
                                    </View>
                                </View>
                                
                                {/* Barra de Progresso Visual */}
                                <View style={styles.progressBarBg}>
                                    <View style={[
                                        styles.progressBarFill, 
                                        { width: `${Math.min(100, (analysis.userBidPct / (analysis.avgBid * 1.2)) * 100)}%` },
                                        analysis.status === 'high' ? {backgroundColor: '#22C55E'} :
                                        analysis.status === 'medium' ? {backgroundColor: '#F59E0B'} : {backgroundColor: '#EF4444'}
                                    ]} />
                                    {/* Marcador da Média */}
                                    <View style={[styles.avgMarker, { left: `${Math.min(100, (analysis.avgBid / (analysis.avgBid * 1.2)) * 100)}%` }]} />
                                </View>

                                <Text style={styles.analysisMessage}>
                                    {analysis.message}
                                </Text>
                            </View>
                        )}

                        <View style={styles.infoGrid}>
                            <View style={styles.infoBox}>
                                <Text style={styles.infoBoxLabel}>Créditos Disponíveis</Text>
                                <Text style={styles.infoBoxValue}>{selectedGroup?.["Créditos Disponíveis"]}</Text>
                            </View>
                             <View style={styles.infoBox}>
                                <Text style={styles.infoBoxLabel}>Última Assembleia</Text>
                                <Text style={styles.infoBoxValue}>{selectedGroup?.Assembleia || 'A definir'}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionDividerTitle}>Estatísticas da Última Assembleia</Text>

                        {/* Estatísticas Principais */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Users size={20} color="#3B82F6" style={{marginBottom: 8}}/>
                                <Text style={styles.statValue}>{selectedGroup?.['Qtd Contemplados'] || '-'}</Text>
                                <Text style={styles.statLabel}>Número de Contemplados</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Target size={20} color="#8B5CF6" style={{marginBottom: 8}}/>
                                <Text style={styles.statValue}>{selectedGroup?.['Qtd Lance Fixo (30/45)'] || '-'}</Text>
                                <Text style={styles.statLabel}>Contemplados por Lance Fixo</Text>
                            </View>
                            <View style={styles.statCard}>
                                <DollarSign size={20} color="#10B981" style={{marginBottom: 8}}/>
                                <Text style={styles.statValue}>{selectedGroup?.['Qtd Lance Livre'] || '-'}</Text>
                                <Text style={styles.statLabel}>Contemplados por Lance Livre</Text>
                            </View>
                        </View>

                        {/* Dados Detalhados */}
                        <View style={styles.detailedStatsContainer}>
                             <View style={styles.detailedRow}>
                                <View style={styles.detailedIconBox}>
                                    <TrendingDown size={16} color="#F59E0B" />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.detailedLabel}>Percentual do Menor Lance Livre</Text>
                                    <Text style={styles.detailedValue}>
                                        {selectedGroup?.['Menor Lance Livre'] ? `${selectedGroup['Menor Lance Livre']}%` : '-'}
                                    </Text>
                                </View>
                             </View>
                             <View style={styles.detailedDivider} />
                             <View style={styles.detailedRow}>
                                <View style={[styles.detailedIconBox, {backgroundColor: '#ECFDF5'}]}>
                                    <BarChart3 size={16} color="#10B981" />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.detailedLabel}>Percentual da Média de Lances Livres</Text>
                                    <Text style={styles.detailedValue}>
                                        {selectedGroup?.['Media Lance Livre'] ? `${selectedGroup['Media Lance Livre']}%` : '-'}
                                    </Text>
                                </View>
                             </View>
                        </View>

                        {/* Outros Campos */}
                        <View style={styles.othersContainer}>
                            {Object.entries(selectedGroup || {}).map(([key, value]) => {
                                if ([
                                    'Grupo', 'TIPO', 'Créditos Disponíveis', 'Prazo Máximo', 'Assembleia', 
                                    'Taxa Adm.', 'Fundo Reserva',
                                    'Qtd Contemplados', 'Qtd Lance Fixo (30/45)', 'Qtd Lance Livre', 'Media Lance Livre', 'Menor Lance Livre',
                                    'qtdContempladosOficial', 'qtdContempladosManual', 'qtdLanceFixo', 'qtdLanceLivre', 'lancesLivresValues'
                                    ].includes(key)) return null;
                                
                                return (
                                    <View key={key} style={styles.otherRow}>
                                        <Text style={styles.otherLabel}>{key}</Text>
                                        <Text style={styles.otherValue}>{String(value)}</Text>
                                    </View>
                                );
                            })}
                        </View>

                   </ScrollView>

                   <View style={styles.groupModalFooter}>
                       <TouchableOpacity style={styles.groupCloseButton} onPress={() => setSelectedGroup(null)}>
                            <Text style={styles.groupCloseButtonText}>FECHAR DETALHES</Text>
                       </TouchableOpacity>
                   </View>
               </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // HEADER RESPONSIVO PADRONIZADO
  headerWrapper: {
    backgroundColor: '#F8FAFC',
    width: '100%',
    alignItems: 'center', // Centraliza o conteúdo interno
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1, textAlign: 'center' },
  
  // BOTÃO DE NAVEGAÇÃO E AÇÃO (Direita)
  navBtn: { 
    height: 40,
    minWidth: 40,
    paddingHorizontal: 12, // Permite crescer se tiver texto
    backgroundColor: '#F1F5F9', // Cor base suave (cinza claro)
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // BOTÃO VOLTAR PADRONIZADO (Esquerda - Fixo 40x40)
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  // SCROLL CONTENT
  scrollContent: { paddingBottom: 40, paddingTop: 10 },

  // HERO CARD
  heroContainer: { marginBottom: 24, marginTop: 10 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    zIndex: 3,
    position: 'relative',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
  },
  heroCardLayer1: { position: 'absolute', bottom: -6, left: 16, right: 16, height: 20, backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 24, zIndex: 2 },
  heroCardLayer2: { position: 'absolute', bottom: -12, left: 32, right: 32, height: 20, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: 24, zIndex: 1 },
  
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  heroValue: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  planBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  planBadgeText: { color: '#E2E8F0', fontSize: 10, fontWeight: '700' },
  
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  heroBottomRow: { flexDirection: 'row', alignItems: 'center' },
  heroDetailItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 222, 128, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  heroDetailText: { color: '#CBD5E1', fontSize: 12, fontWeight: '500' },

  // SECTIONS
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  
  // SWITCH
  switchContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, height: 50 },
  switchButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  switchActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  switchDisabled: { opacity: 0.6 },
  switchText: { fontSize: 13, fontWeight: '600' },
  switchTextActive: { color: '#0F172A', fontWeight: '700' },
  switchTextInactive: { color: '#64748B' },
  helperText: { fontSize: 12, color: '#64748B', marginTop: 10, marginHorizontal: 4, lineHeight: 18 },
  
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#B91C1C', fontSize: 12, fontWeight: '600', marginLeft: 8, flex: 1 },

  // GRID CARDS
  gridContainer: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  gridCard: { 
      flex: 1, 
      backgroundColor: '#FFFFFF', 
      borderRadius: 20, 
      padding: 16, 
      flexDirection: 'column', 
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      minHeight: 110,
      shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 
  },
  gridHeader: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12
  },
  gridContent: {
      width: '100%'
  },
  iconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  gridValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  // CONTENT CARD
  contentCard: { 
      backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 24,
      shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  cardSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  // LANCE STYLING
  percentBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  percentText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  lanceList: { gap: 14 },
  lanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lanceRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lanceRowLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  lanceRowValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  dashDivider: { height: 1, borderTopWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginVertical: 4 },
  totalLanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLanceLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  totalLanceValue: { fontSize: 16, fontWeight: '800', color: '#16A34A' },

  // FEATURED BOX
  featuredBox: { 
      backgroundColor: '#1E293B', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center',
      marginTop: 8, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6
  },
  featuredValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  featuredLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  featuredSub: { color: '#64748B', fontSize: 12, marginTop: 4 },
  infoFooter: { marginTop: 12, alignItems: 'center' },
  infoFooterText: { fontSize: 13, color: '#64748B' },

  // COST LIST
  costList: { gap: 12, marginBottom: 16 },
  costItem: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  costLabel: { fontSize: 14, color: '#64748B' },
  costDots: { flex: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dotted', marginHorizontal: 8 },
  costValue: { fontSize: 14, fontWeight: '600', color: '#334155' },
  grandTotalBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },

  // POST CONTEMPLATION
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginBottom: 20, gap: 10 },
  infoBannerText: { fontSize: 12, color: '#0369A1', flex: 1, lineHeight: 18 },
  
  bigNumbersContainer: { flexDirection: 'row', marginBottom: 24, justifyContent: 'space-around', alignItems: 'center' },
  bigNumberItem: { alignItems: 'center' },
  bigNumberLabel: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', fontWeight: '600', marginBottom: 6 },
  bigNumberValue: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  verticalSep: { width: 1, height: 40, backgroundColor: '#E2E8F0' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  trendText: { fontSize: 10, color: '#15803D', fontWeight: '700', marginLeft: 4 },

  modernTable: { },
  tableHead: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  th: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  td: { fontSize: 14 },

  // RESET BUTTON
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  resetButtonText: { color: '#64748B', fontWeight: '600', fontSize: 14 },

  // MODAL PDF
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 20}, shadowOpacity: 0.25, shadowRadius: 24, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  closeModalBtn: { padding: 4 },
  modalSectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },
  formGroup: { marginBottom: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 50 },
  modalInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  
  generateButton: { backgroundColor: '#0F172A', borderRadius: 14, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  generateButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  // BADGES DE GRUPOS
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  groupBadge: {
    backgroundColor: '#0F172A', // Cor escura para destaque
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  groupBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  noGroupsText: { color: '#64748B', fontSize: 13, fontStyle: 'italic', marginTop: 4 },

  // MODAL DE DETALHES DO GRUPO (NOVO)
  groupModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  groupModalCard: { 
      backgroundColor: '#fff', 
      borderRadius: 24, 
      width: '100%', 
      maxWidth: 480, // Largura máxima para Desktop
      maxHeight: '85%',
      alignSelf: 'center', 
      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column'
  },
  groupModalHeader: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      padding: 24, borderBottomWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF'
  },
  groupIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  groupModalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  groupModalSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  
  closeRoundBtn: { 
      width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', 
      alignItems: 'center', justifyContent: 'center' 
  },
  
  groupModalScroll: { padding: 24 },

  // CARD DE ANÁLISE DE LANCE
  analysisCard: { 
      borderRadius: 16, padding: 16, marginBottom: 24, 
      borderWidth: 1,
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  analysisHigh: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  analysisMedium: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  analysisLow: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  analysisTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  analysisMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  analysisLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  analysisValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  analysisSeparator: { width: 1, height: '100%', backgroundColor: 'rgba(0,0,0,0.1)' },

  progressBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, marginBottom: 12, position: 'relative' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  avgMarker: { position: 'absolute', top: -2, width: 2, height: 12, backgroundColor: '#0F172A', opacity: 0.5 },

  analysisMessage: { fontSize: 13, fontWeight: '500', color: '#334155', lineHeight: 18 },

  // GRID DE INFORMAÇÕES
  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  infoBoxLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  infoBoxValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },

  sectionDividerTitle: { fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },

  // ESTATÍSTICAS PRINCIPAIS
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { 
      flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center',
      shadowColor: '#64748B', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', textAlign: 'center' },

  // ESTATÍSTICAS DETALHADAS
  detailedStatsContainer: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20 },
  detailedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailedIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
  detailedLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  detailedValue: { fontSize: 16, color: '#0F172A', fontWeight: '700' },
  detailedDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },

  // OUTROS CAMPOS
  othersContainer: { marginTop: 8 },
  otherRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  otherLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  otherValue: { fontSize: 13, color: '#334155', fontWeight: '600' },

  groupModalFooter: { padding: 24, borderTopWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
  groupCloseButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  groupCloseButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

});