import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './src/types/navigation';

// Importação das telas
import HomeScreen from './src/screens/HomeScreen';
import TableSelectionScreen from './src/screens/TableSelectionScreen';
import SimulationFormScreen from './src/screens/SimulationFormScreen';
import ResultScreen from './src/screens/ResultScreen';

// Importação do Serviço de Dados
import { DataService, AppData } from './src/services/DataService';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  // Estado para guardar os dados que vamos usar no app inteiro
  const [appData, setAppData] = useState<AppData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Inicializa os dados (Prioridade: Cache do Celular > Arquivo Local Mock)
        // Isso garante que o app abra rápido e funcione offline
        const data = await DataService.initialize();
        setAppData(data);
      } catch (error) {
        console.error("Erro fatal ao carregar dados:", error);
      } finally {
        // Remove a tela de loading assim que tivermos qualquer dado válido
        setIsLoading(false);
      }

      // 2. Tenta atualizar em segundo plano (Sync)
      // O usuário já está usando o app com os dados atuais, enquanto isso
      // o app vai no GitHub verificar se tem novidade para a PRÓXIMA vez.
      DataService.syncWithRemote().then((updated) => {
         if (updated) {
            console.log("Novas tabelas baixadas e salvas no cache para o futuro.");
         }
      });
    };

    load();
  }, []);

  // Tela de Splash (Aparece enquanto o DataService.initialize roda)
  if (isLoading || !appData) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ActivityIndicator size="large" color="#0F172A" />
        <Text style={styles.loadingText}>Carregando tabelas...</Text>
        <Text style={styles.loadingSubText}>Verificando atualizações</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          // Passamos as tabelas carregadas para a Home saber quais categorias exibir
          initialParams={{ tables: appData.tables }} 
        />
        
        <Stack.Screen name="TableSelection" component={TableSelectionScreen} />
        <Stack.Screen name="SimulationForm" component={SimulationFormScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A'
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B'
  }
});