import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_DB, TABLES_METADATA, TableMetadata, setDatabase } from '../../data/TableRepository';

const STORAGE_KEY_DB = '@consorcio_db_v1';
const STORAGE_KEY_META = '@consorcio_meta_v1';
const STORAGE_KEY_DATE = '@consorcio_last_update';

// ==================================================================================
// CONFIGURAÇÃO DA API REMOTA (SOLUÇÃO PARA ERRO 429)
// ==================================================================================
const REMOTE_API_URL = 'https://cdn.jsdelivr.net/gh/alessandroaun/SimuladorConsorcio@master/dados_consorcio.json';

export interface AppData {
  tables: TableMetadata[];
  db: Record<string, any[]>;
  lastUpdate: string | null;
}

// 1. ESTADO LOCAL (Variáveis privadas fora do objeto)
// Iniciamos com os dados estáticos (MOCK) para garantir que nunca seja undefined/null
let _tables: TableMetadata[] = TABLES_METADATA;
let _db: Record<string, any[]> = MOCK_DB;
let _lastUpdate: string | null = null;

export const DataService = {
  
  // 2. GETTERS (Isso faz o DataService.tables funcionar!)
  get tables() {
    return _tables;
  },

  get db() {
    return _db;
  },

  get lastUpdate() {
    return _lastUpdate;
  },

  /**
   * Inicializa os dados: 
   * 1. Tenta pegar do cache do celular (AsyncStorage).
   * 2. Se não tiver cache, usa o MOCK_DB local (Hardcoded).
   */
  async initialize(): Promise<AppData> {
    try {
      const cachedDB = await AsyncStorage.getItem(STORAGE_KEY_DB);
      const cachedMeta = await AsyncStorage.getItem(STORAGE_KEY_META);
      const lastUpdate = await AsyncStorage.getItem(STORAGE_KEY_DATE);

      if (cachedDB && cachedMeta) {
        console.log('Dados carregados do cache local.');
        const parsedDB = JSON.parse(cachedDB);
        const parsedMeta = JSON.parse(cachedMeta);
        
        // ATUALIZA ESTADO LOCAL
        _tables = parsedMeta;
        _db = parsedDB;
        _lastUpdate = lastUpdate;

        // CRUCIAL: Atualiza o repositório para usar os dados do cache
        setDatabase(parsedDB);

        return {
          tables: _tables,
          db: _db,
          lastUpdate: _lastUpdate
        };
      }
    } catch (e) {
      console.error('Erro ao ler cache local:', e);
    }

    console.log('Cache vazio ou erro. Usando dados embarcados (Fallback).');
    
    // Fallback: Reinicia variáveis locais com Mocks
    _tables = TABLES_METADATA;
    _db = MOCK_DB;
    _lastUpdate = null;
    
    // CRUCIAL: Garante que o repositório use o Mock se não houver cache
    setDatabase(MOCK_DB);

    return {
      tables: _tables,
      db: _db,
      lastUpdate: null
    };
  },

  /**
   * Chamado em segundo plano para tentar atualizar os dados da nuvem.
   * Retorna os NOVOS dados baixados (AppData) em caso de sucesso, ou null.
   */
  async syncWithRemote(): Promise<AppData | null> {
    // Verifica se a URL ainda é a padrão/exemplo antes de tentar
    if (!REMOTE_API_URL || REMOTE_API_URL.includes('SEU_USUARIO')) {
      console.log('AVISO: URL remota não configurada. Pulando sync.');
      return null;
    }

    try {
      console.log(`Buscando atualizações em: ${REMOTE_API_URL}`);
      
      const urlComCacheBuster = `${REMOTE_API_URL}?t=${new Date().getTime()}`;
      
      const response = await fetch(urlComCacheBuster);
      
      if (!response.ok) {
        throw new Error(`Falha ao buscar dados: ${response.status} ${response.statusText}`);
      }
      
      const apiResult = await response.json();
      
      // Validação básica da estrutura
      const { metadata, data } = apiResult;
      if (!data || !metadata) throw new Error("Formato de JSON inválido (esperado { metadata, data })");

      // Salva no celular para a próxima vez
      await AsyncStorage.setItem(STORAGE_KEY_DB, JSON.stringify(data));
      await AsyncStorage.setItem(STORAGE_KEY_META, JSON.stringify(metadata));
      await AsyncStorage.setItem(STORAGE_KEY_DATE, new Date().toISOString());
      
      console.log('Dados atualizados da nuvem e salvos no cache.');
      
      // ATUALIZA ESTADO LOCAL
      _tables = metadata;
      _db = data;
      _lastUpdate = new Date().toISOString();

      // CRUCIAL: Atualiza o repositório imediatamente com os novos dados da nuvem
      setDatabase(data);

      return {
        tables: _tables,
        db: _db,
        lastUpdate: _lastUpdate
      };

    } catch (error) {
      console.log('Erro na sincronização (pode ser falta de internet ou URL errada):', error);
      return null;
    }
  }
};