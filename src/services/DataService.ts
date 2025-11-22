import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_DB, TABLES_METADATA, TableMetadata } from '../../data/TableRepository';

const STORAGE_KEY_DB = '@consorcio_db_v1';
const STORAGE_KEY_META = '@consorcio_meta_v1';
const STORAGE_KEY_DATE = '@consorcio_last_update';

// URL onde seu JSON estará hospedado (Ex: GitHub Gist ou S3)
// Por enquanto, deixamos vazio ou use um exemplo
const REMOTE_API_URL = 'https://sua-api.com/dados-consorcio.json'; 

export interface AppData {
  tables: TableMetadata[];
  db: Record<string, any[]>;
  lastUpdate: string | null;
}

export const DataService = {
  /**
   * Inicializa os dados: Tenta pegar do cache, se não existir, usa o Mock local.
   * Em background, tenta atualizar da internet.
   */
  async initialize(): Promise<AppData> {
    try {
      // 1. Tentar ler do armazenamento local (Cache)
      const cachedDB = await AsyncStorage.getItem(STORAGE_KEY_DB);
      const cachedMeta = await AsyncStorage.getItem(STORAGE_KEY_META);
      const lastUpdate = await AsyncStorage.getItem(STORAGE_KEY_DATE);

      if (cachedDB && cachedMeta) {
        console.log('Dados carregados do cache local.');
        return {
          tables: JSON.parse(cachedMeta),
          db: JSON.parse(cachedDB),
          lastUpdate
        };
      }
    } catch (e) {
      console.error('Erro ao ler cache local:', e);
    }

    // 2. Se não tiver cache, retorna os dados embarcados (Hardcoded)
    console.log('Cache vazio. Usando dados embarcados (Mock).');
    return {
      tables: TABLES_METADATA,
      db: MOCK_DB, // O MOCK_DB do TableRepository deve ser exportado
      lastUpdate: null
    };
  },

  /**
   * Chamado para forçar uma atualização remota (ex: ao abrir o app ou puxar pra atualizar)
   */
  async syncWithRemote(): Promise<boolean> {
    try {
      // Simulação de fetch (Substitua pelo fetch real)
      // const response = await fetch(REMOTE_API_URL);
      // const data = await response.json();
      
      // Supondo que a API retorne { metadata: [], data: {} }
      // const { metadata, data } = apiResult;

      // Validação básica antes de salvar
      // if (!data || !metadata) throw new Error("Dados inválidos");

      // Salvar no Cache
      // await AsyncStorage.setItem(STORAGE_KEY_DB, JSON.stringify(data));
      // await AsyncStorage.setItem(STORAGE_KEY_META, JSON.stringify(metadata));
      // await AsyncStorage.setItem(STORAGE_KEY_DATE, new Date().toISOString());
      
      console.log('Sincronização realizada com sucesso (Simulado).');
      return true;
    } catch (error) {
      console.warn('Sem internet ou erro na API. Mantendo dados atuais.');
      return false;
    }
  }
};