import * as React from 'react';
import { useState } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, 
  Platform, StatusBar, Modal, TextInput, KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { 
  ArrowLeft, Share2, CheckCircle2, Car, CalendarClock, AlertTriangle, 
  Ban, DollarSign, Calendar, FileText, Info, RefreshCw, TrendingDown,
  User, Phone, Briefcase, X, FileOutput, Printer
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { RootStackParamList } from '../types/navigation';
import { ContemplationScenario } from '../utils/ConsortiumCalculator';
import { generateHTML } from '../utils/GeneratePDFHtml';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

type ScenarioMode = 'REDUZIDO' | 'CHEIO';

export default function ResultScreen({ route, navigation }: Props) {
  // Pega quotaCount se vier, senão assume 1
  const { result, input, quotaCount = 1 } = route.params;
  
  // Verifica se o Caminho 1 é viável (não é null)
  const isCaminho1Viable = result.cenarioCreditoReduzido !== null;

  // Estado para controlar qual caminho o usuário está vendo
  const [mode, setMode] = useState<ScenarioMode>(() => {
     // Se for plano especial (Light/SuperLight), tenta mostrar o reduzido primeiro se viável
     const isSpecial = result.plano === 'LIGHT' || result.plano === 'SUPERLIGHT';
     if (isSpecial && isCaminho1Viable) return 'REDUZIDO';
     // Caso contrário (ou se for normal), mostra o padrão/cheio
     return 'CHEIO';
  });

  // Modal de dados do cliente para PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');

  // Define qual cenário está ativo para exibição na tela
  let activeScenario: ContemplationScenario[] = result.cenariosContemplacao;
  let activeTitle = "Plano Padrão";
  let activeDescription = "Parcelas e prazos baseados no crédito original.";

  if (result.cenarioCreditoReduzido && mode === 'REDUZIDO') {
      activeScenario = result.cenarioCreditoReduzido;
      activeTitle = "Opção 1: Crédito Reduzido";
      activeDescription = "Mantém a parcela menor, recebendo crédito proporcional.";
  } else if (result.cenarioCreditoTotal && mode === 'CHEIO') {
      activeScenario = result.cenarioCreditoTotal;
      activeTitle = result.plano === 'NORMAL' ? "Plano Padrão" : "Opção 2: Crédito Total (100%)";
      activeDescription = result.plano === 'NORMAL' 
        ? "Detalhes da simulação padrão." 
        : "Recebe o crédito cheio, com reajuste na parcela.";
  }

  // --- FUNÇÃO DE GERAÇÃO DE PDF (ADAPTADA PARA WEB) ---
  const handleGeneratePDF = async () => {
    try {
      const html = generateHTML(
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
        // NA WEB: Abre a janela de impressão do navegador (onde o usuário salva como PDF)
        await Print.printAsync({ html });
        setShowPdfModal(false);
      } else {
        // NO CELULAR (Android/iOS): Gera arquivo e abre menu de compartilhar
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        setShowPdfModal(false);
      }

    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
      console.error(error);
    }
  };

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resultado da Simulação</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SELETOR DE MODO (Só aparece para planos Light/SuperLight) */}
        {(result.plano === 'LIGHT' || result.plano === 'SUPERLIGHT') && (
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Escolha o Cenário de Contemplação:</Text>
                <View style={styles.toggleRow}>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, mode === 'REDUZIDO' && styles.toggleBtnActive, !isCaminho1Viable && styles.toggleBtnDisabled]} 
                        onPress={() => isCaminho1Viable && setMode('REDUZIDO')}
                        disabled={!isCaminho1Viable}
                    >
                        <Text style={[styles.toggleBtnText, mode === 'REDUZIDO' && styles.toggleBtnTextActive]}>Crédito Reduzido</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.toggleBtn, mode === 'CHEIO' && styles.toggleBtnActive]} 
                        onPress={() => setMode('CHEIO')}
                    >
                        <Text style={[styles.toggleBtnText, mode === 'CHEIO' && styles.toggleBtnTextActive]}>Crédito 100%</Text>
                    </TouchableOpacity>
                </View>
                {!isCaminho1Viable && (
                    <Text style={styles.warningSmall}>* Opção Reduzida indisponível pois o lance supera o crédito reduzido.</Text>
                )}
            </View>
        )}

        {/* RESUMO DO RESULTADO */}
        <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
                <CheckCircle2 size={24} color="#10B981" />
                <View>
                    <Text style={styles.resultTitle}>{activeTitle}</Text>
                    <Text style={styles.resultSubtitle}>{activeDescription}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.kpiRow}>
                <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>Crédito Líquido</Text>
                    <Text style={styles.kpiValueBig}>
                        {formatBRL(
                            mode === 'REDUZIDO' && result.cenarioCreditoReduzido 
                            ? result.cenarioCreditoReduzido[0].creditoEfetivo - input.lanceCartaVal
                            : result.creditoLiquido - (mode === 'CHEIO' && result.plano !== 'NORMAL' ? (result.creditoOriginal * input.lanceEmbutidoPct) : 0)
                        )}
                    </Text>
                </View>
            </View>

            <View style={styles.grid}>
                 <View style={styles.gridItem}>
                    <DollarSign size={16} color="#64748B" />
                    <View>
                        <Text style={styles.gridLabel}>1ª Parcela</Text>
                        <Text style={styles.gridValue}>{formatBRL(result.totalPrimeiraParcela)}</Text>
                    </View>
                 </View>
                 <View style={styles.gridItem}>
                    <CalendarClock size={16} color="#64748B" />
                    <View>
                        <Text style={styles.gridLabel}>Parcela Padrão</Text>
                        <Text style={styles.gridValue}>{formatBRL(result.parcelaPreContemplacao)}</Text>
                    </View>
                 </View>
            </View>

            {mode === 'CHEIO' && result.plano !== 'NORMAL' && result.parcelaPosCaminho2 > 0 && (
                 <View style={styles.alertBox}>
                    <AlertTriangle size={16} color="#B45309" />
                    <Text style={styles.alertText}>
                        Após a contemplação, se optar pelo crédito de 100%, sua parcela será reajustada para <Text style={{fontWeight:'bold'}}>{formatBRL(result.parcelaPosCaminho2)}</Text>.
                    </Text>
                 </View>
            )}
        </View>

        {/* TABELA DE PROJEÇÃO */}
        <Text style={styles.sectionTitle}>Projeção Pós-Contemplação</Text>
        <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
                <Text style={[styles.th, {flex: 0.5, textAlign: 'center'}]}>Mês</Text>
                <Text style={[styles.th, {flex: 1}]}>Nova Parcela</Text>
                <Text style={[styles.th, {flex: 0.8, textAlign: 'center'}]}>Prazo Rest.</Text>
            </View>
            {activeScenario.map((cenario, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                     <Text style={[styles.td, {flex: 0.5, textAlign: 'center', fontWeight: '700'}]}>{cenario.mes}</Text>
                     <View style={{flex: 1}}>
                        <Text style={[styles.td, {color: '#2563EB', fontWeight: '700'}]}>{formatBRL(cenario.novaParcela)}</Text>
                        <Text style={styles.tdSmall}>{cenario.amortizacaoInfo}</Text>
                     </View>
                     <Text style={[styles.td, {flex: 0.8, textAlign: 'center'}]}>{Math.round(cenario.novoPrazo)}</Text>
                </View>
            ))}
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
         <TouchableOpacity style={styles.outlineButton} onPress={() => setShowPdfModal(true)}>
             <Share2 size={20} color="#0F172A" style={{marginRight: 8}} />
             <Text style={styles.outlineButtonText}>COMPARTILHAR PDF</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.popToTop()}>
             <RefreshCw size={20} color="#fff" style={{marginRight: 8}} />
             <Text style={styles.primaryButtonText}>NOVA SIMULAÇÃO</Text>
         </TouchableOpacity>
      </View>

      {/* MODAL DE DADOS PARA PDF */}
      <Modal visible={showPdfModal} animationType="slide" transparent>
         <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
             <View style={styles.modalContent}>
                 <View style={styles.modalHeader}>
                     <Text style={styles.modalTitle}>Dados para o Relatório</Text>
                     <TouchableOpacity onPress={() => setShowPdfModal(false)} style={styles.closeBtn}>
                         <X size={24} color="#64748B" />
                     </TouchableOpacity>
                 </View>
                 
                 <Text style={{color: '#64748B', marginBottom: 16}}>Preencha os dados abaixo para personalizar o PDF (Opcional).</Text>

                 <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <User size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Nome do Cliente</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ex: João Silva" 
                        value={clientName}
                        onChangeText={setClientName}
                    />
                 </View>

                 <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Phone size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Telefone do Cliente</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="(00) 00000-0000" 
                        keyboardType="phone-pad"
                        value={clientPhone}
                        onChangeText={setClientPhone}
                    />
                 </View>

                 <View style={{height: 1, backgroundColor: '#E2E8F0', marginVertical: 12}} />

                 <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Briefcase size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Seu Nome (Vendedor)</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ex: Consultor Recon" 
                        value={sellerName}
                        onChangeText={setSellerName}
                    />
                 </View>

                 <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Phone size={16} color="#334155" />
                        <Text style={styles.inputLabel}>Seu Contato</Text>
                    </View>
                    <TextInput 
                        style={styles.input} 
                        placeholder="(00) 00000-0000" 
                        keyboardType="phone-pad"
                        value={sellerPhone}
                        onChangeText={setSellerPhone}
                    />
                 </View>

                 <TouchableOpacity style={[styles.primaryButton, {marginTop: 16}]} onPress={handleGeneratePDF}>
                     <Printer size={20} color="#fff" style={{marginRight: 8}} />
                     <Text style={styles.primaryButtonText}>
                        {Platform.OS === 'web' ? 'IMPRIMIR / SALVAR PDF' : 'GERAR E COMPARTILHAR'}
                     </Text>
                 </TouchableOpacity>
             </View>
         </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12, marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 20 },
  
  toggleContainer: { marginBottom: 20 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleBtnDisabled: { opacity: 0.5 },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  toggleBtnTextActive: { color: '#0F172A', fontWeight: '800' },
  warningSmall: { fontSize: 11, color: '#EF4444', marginTop: 4, fontStyle: 'italic' },

  resultCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#64748B', shadowOpacity: 0.08, shadowOffset: {width:0, height:8}, elevation: 4 },
  resultHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  resultSubtitle: { fontSize: 12, color: '#64748B', maxWidth: '90%' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  
  kpiRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  kpiItem: { alignItems: 'center' },
  kpiLabel: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  kpiValueBig: { fontSize: 32, fontWeight: '800', color: '#059669' },

  grid: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  gridLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  gridValue: { fontSize: 15, fontWeight: '800', color: '#334155' },

  alertBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', padding: 12, borderRadius: 12, marginTop: 16 },
  alertText: { flex: 1, fontSize: 12, color: '#B45309', lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  tableCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  td: { fontSize: 13, color: '#334155' },
  tdSmall: { fontSize: 11, color: '#64748B', marginTop: 2 },

  footer: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  outlineButtonText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  closeBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  
  inputGroup: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  input: { 
      backgroundColor: '#F8FAFC', 
      borderWidth: 1, 
      borderColor: '#E2E8F0', 
      borderRadius: 12, 
      padding: 12, 
      fontSize: 16, 
      color: '#0F172A' 
  },
});