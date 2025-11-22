import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, SafeAreaView, Alert, Switch, Modal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Calculator, DollarSign } from 'lucide-react-native';
import { RootStackParamList } from '../types/navigation';
import { getTableData } from '../../data/TableRepository';
import { ConsortiumCalculator, SimulationInput, InstallmentType } from '../utils/ConsortiumCalculator';

type Props = NativeStackScreenProps<RootStackParamList, 'SimulationForm'>;

export default function SimulationFormScreen({ route, navigation }: Props) {
  const { table } = route.params;
  const rawData = getTableData(table.id);

  // States
  const [creditoInput, setCreditoInput] = useState('');
  const [prazoIdx, setPrazoIdx] = useState<number | null>(null);
  const [tipoParcela, setTipoParcela] = useState<InstallmentType>('S/SV');
  
  // Lance States
  const [showLanceModal, setShowLanceModal] = useState(false);
  const [lanceBolso, setLanceBolso] = useState('0');
  const [lanceEmbPct, setLanceEmbPct] = useState(0);

  // Helpers
  const availableCredits = useMemo(() => rawData.map(r => r.credito).sort((a,b) => a-b), [rawData]);
  
  const selectedRow = useMemo(() => {
    const val = parseFloat(creditoInput);
    return rawData.find(r => r.credito === val) || null;
  }, [creditoInput, rawData]);

  const availablePrazos = selectedRow ? selectedRow.prazos : [];

  const handleCalculate = () => {
    if (!selectedRow || prazoIdx === null) {
      Alert.alert("Dados incompletos", "Por favor, selecione um crédito válido e um prazo.");
      return;
    }

    const prazoObj = availablePrazos[prazoIdx];
    
    // Resolve qual valor de parcela base usar (do CSV)
    let rawParcela = 0;
    if (prazoObj.parcela) {
      // CSVs tipo Auto_L usam coluna única já tratada na importação
      rawParcela = prazoObj.parcela;
    } else {
      // CSVs tipo Normal/Imóvel usam colunas C/SV e S/SV explícitas
      rawParcela = tipoParcela === 'C/SV' ? prazoObj.parcela_CSV : prazoObj.parcela_SSV;
    }

    if(!rawParcela) {
       Alert.alert("Erro", "Parcela não disponível para este tipo de seguro/prazo.");
       return;
    }

    const input: SimulationInput = {
      tableId: table.id,
      credito: selectedRow.credito,
      prazo: prazoObj.prazo,
      tipoParcela,
      lanceBolso: parseFloat(lanceBolso) || 0,
      lanceEmbutidoPct: lanceEmbPct,
      lanceCartaVal: 0
    };

    const error = ConsortiumCalculator.validate(input, table);
    if (error) {
      Alert.alert("Erro de Validação", error);
      return;
    }

    const result = ConsortiumCalculator.calculate(input, table, rawParcela);
    navigation.navigate('Result', { result, input });
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#0F172A" size={24} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Simular {table.category}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CREDITO INPUT */}
        <View style={styles.card}>
          <Text style={styles.label}>Valor do Crédito (R$)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            placeholder="Ex: 100000" 
            value={creditoInput}
            onChangeText={setCreditoInput}
            placeholderTextColor="#94A3B8"
          />
          {/* Chips de Sugestão */}
          {!selectedRow && availableCredits.length > 0 && (
            <View style={styles.chipContainer}>
              {availableCredits.slice(0, 6).map((c) => (
                <TouchableOpacity key={c} onPress={() => setCreditoInput(c.toString())} style={styles.chip}>
                  <Text style={styles.chipText}>{c >= 1000 ? (c/1000).toFixed(0)+'k' : c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* PRAZO SELECTION */}
        <View style={styles.card}>
          <Text style={styles.label}>Prazo (Meses)</Text>
          <View style={styles.pillsContainer}>
            {availablePrazos.length > 0 ? availablePrazos.map((p: any, idx: number) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.pill, idx === prazoIdx && styles.pillActive]}
                onPress={() => setPrazoIdx(idx)}
              >
                <Text style={[styles.pillText, idx === prazoIdx && styles.pillTextActive]}>{p.prazo}x</Text>
              </TouchableOpacity>
            )) : (
              <Text style={styles.helperText}>Digite um crédito válido para ver os prazos.</Text>
            )}
          </View>
        </View>

        {/* SEGURO TOGGLE */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Seguro Prestamista</Text>
            <Switch 
              value={tipoParcela === 'C/SV'}
              onValueChange={(v) => setTipoParcela(v ? 'C/SV' : 'S/SV')}
              trackColor={{true: '#0EA5E9', false: '#E2E8F0'}}
            />
          </View>
          <Text style={styles.helperText}>{tipoParcela === 'C/SV' ? 'Com proteção (Incluso na parcela)' : 'Sem seguro de vida'}</Text>
        </View>

        {/* LANCES BUTTON */}
        <TouchableOpacity style={styles.lanceBtn} onPress={() => setShowLanceModal(true)}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <DollarSign color="#0F172A" size={20} />
            <Text style={styles.lanceBtnText}>Configurar Lances</Text>
          </View>
          <Text style={styles.lanceBtnValue}>
            {lanceEmbPct > 0 || parseFloat(lanceBolso) > 0 ? 'Ativo' : 'Opcional'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.mainBtn} onPress={handleCalculate}>
          <Calculator color="#fff" size={24} style={{marginRight: 8}} />
          <Text style={styles.mainBtnText}>CALCULAR SIMULAÇÃO</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE LANCES */}
      <Modal visible={showLanceModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Configurar Lances</Text>
          
          <Text style={styles.label}>Lance Embutido ({Math.round(lanceEmbPct*100)}%)</Text>
          <View style={styles.rowBetween}>
             {[0, 0.10, 0.25].map(pct => (
               <TouchableOpacity 
                key={pct} 
                style={[styles.pctBtn, lanceEmbPct === pct && styles.pctBtnActive]}
                onPress={() => setLanceEmbPct(pct)}
               >
                 <Text style={[styles.pctText, lanceEmbPct === pct && styles.pctTextActive]}>{pct*100}%</Text>
               </TouchableOpacity>
             ))}
          </View>
          <Text style={styles.helperText}>Desconta do crédito para facilitar a contemplação.</Text>

          <Text style={[styles.label, {marginTop: 24}]}>Lance do Bolso (R$)</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            value={lanceBolso}
            onChangeText={setLanceBolso}
            placeholder="0.00"
          />

          <TouchableOpacity style={[styles.mainBtn, {marginTop: 40}]} onPress={() => setShowLanceModal(false)}>
            <Text style={styles.mainBtnText}>CONFIRMAR LANCES</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  navHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 8, marginRight: 8 },
  navTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, fontSize: 18, borderWidth: 1, borderColor: '#CBD5E1', color: '#0F172A' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  chipText: { color: '#0284C7', fontWeight: '600', fontSize: 12 },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  pillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  pillText: { color: '#334155' },
  pillTextActive: { color: '#fff', fontWeight: 'bold' },
  helperText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lanceBtn: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  lanceBtnText: { marginLeft: 12, fontSize: 16, fontWeight: '500', color: '#0F172A' },
  lanceBtnValue: { color: '#64748B' },
  mainBtn: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#0F172A' },
  pctBtn: { flex: 1, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, marginHorizontal: 4 },
  pctBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  pctText: { fontWeight: '600', color: '#334155' },
  pctTextActive: { color: '#fff' },
});