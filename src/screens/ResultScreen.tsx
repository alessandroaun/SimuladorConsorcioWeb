import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, 
  Platform, StatusBar, Modal, TextInput, KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  ArrowLeft, Share2, DollarSign, Calendar, FileText, RefreshCw, TrendingDown,
  User, Phone, Briefcase, X, FileOutput
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { RootStackParamList } from '../types/navigation';
import { ContemplationScenario } from '../utils/ConsortiumCalculator';
import { generateHTML } from '../utils/GeneratePDFHtml';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

type ScenarioMode = 'REDUZIDO' | 'CHEIO';

export default function ResultScreen({ route, navigation }: Props) {
  // Recebe parâmetros. Se quotaCount não vier, assume 1.
  const { result, input, quotaCount = 1 } = route.params;
  
  const isCaminho1Viable = result.cenarioCreditoReduzido !== null;

  const [mode, setMode] = useState<ScenarioMode>(
    isCaminho1Viable ? 'REDUZIDO' : 'CHEIO'
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- LÓGICA DE PDF HÍBRIDA (WEB/NATIVE) ---
  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      
      const htmlContent = generateHTML(
        result, 
        input, 
        mode,
        {
            cliente: clientName,
            telefoneCliente: clientPhone,
            vendedor: sellerName,
            telefoneVendedor: sellerPhone
        },
        quotaCount
      );

      if (Platform.OS === 'web') {
        // NA WEB: Abre diálogo de impressão do navegador
        await Print.printAsync({
            html: htmlContent,
            orientation: Print.Orientation.portrait
        });
      } else {
        // NO APP: Gera arquivo temporário e compartilha
        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false
        });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, { 
                UTI: '.pdf', 
                mimeType: 'application/pdf', 
                dialogTitle: 'Compartilhar Simulação' 
            });
        } else {
            Alert.alert("Sucesso", "PDF salvo, mas compartilhamento indisponível.");
        }
      }

      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  let activeScenarioData: ContemplationScenario[] = [];
  let displayParcela = 0;
  let displayCustoTotal = 0;
  
  if (mode === 'REDUZIDO' && result.cenarioCreditoReduzido) {
      activeScenarioData = result.cenarioCreditoReduzido as any;
      displayParcela = activeScenarioData[0]?.novaParcela || 0; 
      displayCustoTotal = result.custoTotalReduzido || 0;
  } else if (mode === 'CHEIO' && result.cenarioCreditoTotal) {
      activeScenarioData = result.cenarioCreditoTotal as any;
      displayParcela = activeScenarioData[0]?.novaParcela || 0;
      displayCustoTotal = result.custoTotalCheio || 0;
  } else {
      activeScenarioData = result.cenariosContemplacao;
      displayParcela = activeScenarioData[0]?.novaParcela || 0;
      displayCustoTotal = result.custoTotal;
  }

  const renderInfoCard = (label: string, value: string, icon: React.ReactNode, highlight: boolean = false) => (
    <View style={[styles.card, highlight && styles.highlightCard]}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, highlight ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#F1F5F9' }]}>
                {icon}
            </View>
            <Text style={styles.cardLabel}>{label}</Text>
        </View>
        <Text style={[styles.cardValue, highlight && { color: '#166534' }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultado</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.shareButton}>
            <Share2 size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SELETOR DE MODO */}
        {(result.plano === 'LIGHT' || result.plano === 'SUPERLIGHT') && (
            <View style={styles.modeSelector}>
                <TouchableOpacity 
                    style={[styles.modeButton, mode === 'REDUZIDO' && styles.modeButtonActive, !isCaminho1Viable && { opacity: 0.5 }]}
                    onPress={() => isCaminho1Viable && setMode('REDUZIDO')}
                    disabled={!isCaminho1Viable}
                >
                    <Text style={[styles.modeText, mode === 'REDUZIDO' && styles.modeTextActive]}>Crédito Reduzido</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.modeButton, mode === 'CHEIO' && styles.modeButtonActive]}
                    onPress={() => setMode('CHEIO')}
                >
                    <Text style={[styles.modeText, mode === 'CHEIO' && styles.modeTextActive]}>Crédito Total</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* RESUMO */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo ({result.plano})</Text>
            {quotaCount > 1 && (
                 <View style={styles.quotaBadge}>
                    <Text style={styles.quotaText}>Consolidado: {quotaCount} cotas</Text>
                 </View>
            )}
            <View style={styles.grid}>
                {renderInfoCard('Crédito Total', formatBRL(result.creditoOriginal), <DollarSign size={18} color="#64748B" />, true)}
                {renderInfoCard('Prazo', `${input.prazo} meses`, <Calendar size={18} color="#64748B" />)}
            </View>
            <View style={styles.grid}>
                {renderInfoCard('1ª Parcela', formatBRL(result.totalPrimeiraParcela), <FileText size={18} color="#64748B" />)}
                {renderInfoCard('Mensal', formatBRL(result.parcelaPreContemplacao), <RefreshCw size={18} color="#64748B" />)}
            </View>
        </View>

        {/* CUSTO TOTAL */}
        <View style={styles.totalCostBox}>
            <View>
                <Text style={styles.totalCostLabel}>Custo Total</Text>
                <Text style={styles.totalCostSub}>(Crédito + Taxas - Lances)</Text>
            </View>
            <Text style={styles.totalCostValue}>{formatBRL(displayCustoTotal)}</Text>
        </View>

        {/* APÓS CONTEMPLAÇÃO */}
        <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
                <TrendingDown size={20} color="#2563EB" />
                <Text style={styles.sectionTitle}>Pós-Contemplação</Text>
            </View>
            
            <View style={styles.contemplationCard}>
                <View style={styles.contemplationRow}>
                    <Text style={styles.cLabel}>Nova Parcela:</Text>
                    <Text style={styles.cValue}>{formatBRL(displayParcela)}</Text>
                </View>
                <View style={styles.divider} />
                <Text style={styles.cNote}>* Após amortização do lance.</Text>
            </View>

            {/* TABELA */}
            <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1 }]}>Mês</Text>
                <Text style={[styles.th, { flex: 2 }]}>Parcela</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Prazo</Text>
            </View>
            {activeScenarioData.map((cenario, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowZebra]}>
                    <Text style={[styles.td, { flex: 1, fontWeight: '700' }]}>{cenario.mes}</Text>
                    <Text style={[styles.td, { flex: 2, color: '#1E40AF', fontWeight: '700' }]}>{formatBRL(cenario.novaParcela)}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{Math.round(cenario.novoPrazo)}x</Text>
                </View>
            ))}
        </View>
        <View style={{height: 40}} />
      </ScrollView>

      {/* MODAL FORMULÁRIO PDF */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Gerar Proposta PDF</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                        <X size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <User size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Cliente</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Nome do Cliente" 
                        value={clientName}
                        onChangeText={setClientName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Phone size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Telefone Cliente</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="(00) 00000-0000" 
                        keyboardType="phone-pad"
                        value={clientPhone}
                        onChangeText={setClientPhone}
                    />
                </View>
                
                <View style={{flexDirection: 'row', gap: 12}}>
                     <View style={[styles.inputGroup, { flex: 1 }]}>
                        <View style={styles.labelRow}>
                            <Briefcase size={16} color="#334155" />
                            <Text style={styles.inputLabel}>Vendedor</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Seu Nome" 
                            value={sellerName}
                            onChangeText={setSellerName}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <View style={styles.labelRow}>
                            <Phone size={16} color="#334155" />
                            <Text style={styles.inputLabel}>Tel. Vendedor</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="(00) 0..." 
                            keyboardType="phone-pad"
                            value={sellerPhone}
                            onChangeText={setSellerPhone}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.generateButton, isGenerating && { opacity: 0.7 }]} 
                    onPress={handleGeneratePDF}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <Text style={styles.generateButtonText}>Gerando...</Text>
                    ) : (
                        <>
                            <FileOutput size={20} color="#fff" style={{marginRight: 8}} />
                            <Text style={styles.generateButtonText}>
                                {Platform.OS === 'web' ? 'Imprimir / Salvar PDF' : 'Compartilhar PDF'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: '#F1F5F9' },
  shareButton: { padding: 8, borderRadius: 8, backgroundColor: '#2563EB' },
  scrollContent: { padding: 20 },
  modeSelector: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 24 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  modeButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  modeText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  modeTextActive: { color: '#0F172A', fontWeight: '800' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  highlightCard: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  iconContainer: { padding: 6, borderRadius: 8 },
  cardLabel: { fontSize: 11, color: '#64748B', fontWeight: '600', flex: 1 },
  cardValue: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  totalCostBox: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  totalCostLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  totalCostSub: { color: '#64748B', fontSize: 10 },
  totalCostValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  contemplationCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16 },
  contemplationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cLabel: { fontSize: 14, color: '#1E40AF', fontWeight: '600' },
  cValue: { fontSize: 18, color: '#1E40AF', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#EFF6FF', marginVertical: 12 },
  cNote: { fontSize: 11, color: '#64748B', fontStyle: 'italic' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#E2E8F0', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  tableRowZebra: { backgroundColor: '#F8FAFC' },
  td: { fontSize: 13, color: '#334155' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', padding: 16, borderRadius: 16, marginTop: 10 },
  generateButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#0F172A'},
  quotaBadge: { backgroundColor: '#EFF6FF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#DBEAFE'},
  quotaText: { color: '#1E40AF', fontSize: 11, fontWeight: '700'}
});