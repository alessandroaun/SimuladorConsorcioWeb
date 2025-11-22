import { SimulationResult, SimulationInput } from '../utils/ConsortiumCalculator';
import { TableMetadata } from '../../data/TableRepository';

export type RootStackParamList = {
  // ATUALIZADO: Home agora aceita um parâmetro opcional 'tables'
  Home: { tables?: TableMetadata[] };
  TableSelection: { category: string };
  SimulationForm: { table: TableMetadata };
  Result: { result: SimulationResult; input: SimulationInput };
};