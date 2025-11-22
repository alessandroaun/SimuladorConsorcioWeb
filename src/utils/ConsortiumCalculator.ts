/**
 * ============================================================================
 * ConsortiumCalculator.ts
 * Lógica central de cálculo financeiro do simulador.
 * ============================================================================
 */

// --- Tipos e Interfaces ---

export type PlanType = 'NORMAL' | 'LIGHT' | 'SUPERLIGHT';
export type InstallmentType = 'C/SV' | 'S/SV'; // Com Seguro Vida / Sem Seguro Vida
export type Category = 'AUTO' | 'IMOVEL' | 'MOTO' | 'SERVICOS';

export interface TableMetadata {
  id: string;
  name: string;
  category: Category;
  plan: PlanType;
  taxaAdmin: number;      // Ex: 0.20 para 20%
  fundoReserva: number;   // Ex: 0.03 para 3%
  seguroPct?: number;     // Taxa forçada (opcional), senão usa padrão da categoria
  maxLanceEmbutido: number; // Ex: 0.25 para 25%
}

export interface SimulationInput {
  tableId: string;
  credito: number;        // Valor da Carta (C)
  prazo: number;          // Meses (p)
  tipoParcela: InstallmentType;
  lanceBolso: number;     // Valor R$
  lanceEmbutidoPct: number; // Decimal (ex: 0.25)
  lanceCartaVal: number;  // Valor R$ (Carta de Avaliação)
}

export interface AmortizationRow {
  mes: number;
  saldoDevedor: number;
  valorPago: number;
}

export interface SimulationResult {
  // Valores Mensais
  parcelaPreContemplacao: number;
  parcelaPosContemplacao: number; // Estimativa caso opte por recompor crédito (Opção B)
  
  // Detalhamento da Parcela
  seguroMensal: number;
  
  // Totais
  custoTotal: number;
  taxaAdminValor: number;
  fundoReservaValor: number;
  
  // Lances e Crédito
  creditoOriginal: number;
  creditoLiquido: number; // O que sobra na mão após descontar lances que abatem crédito
  lanceTotal: number;
  lanceEmbutidoValor: number;
  
  // Metadados
  plano: PlanType;
  amortizacao: AmortizationRow[];
}

// --- Constantes de Negócio ---

const SEGURO_RATES = {
  IMOVEL: 0.00059, // 0.059% a.m.
  OUTROS: 0.00084  // 0.084% a.m. (Auto, Moto, Serviços)
};

export class ConsortiumCalculator {

  /**
   * Realiza o cálculo completo da simulação.
   * * @param input Dados inseridos pelo usuário (crédito, prazo, lances)
   * @param tableMeta Metadados da tabela selecionada (taxas, tipo de plano)
   * @param rawParcela Valor da parcela BASE obtido do arquivo JSON/CSV. 
   * IMPORTANTE: Este valor já deve considerar a taxa de adm diluída 
   * conforme a tabela da administradora.
   */
  static calculate(
    input: SimulationInput, 
    tableMeta: TableMetadata, 
    rawParcela: number
  ): SimulationResult {
    
    const { credito, prazo, lanceEmbutidoPct, lanceBolso, lanceCartaVal, tipoParcela } = input;

    // 1. Definição de Taxas de Seguro
    // Se a tabela tiver uma taxa específica no JSON, usa ela. Senão, usa a padrão da categoria.
    const defaultSeguroRate = tableMeta.category === 'IMOVEL' ? SEGURO_RATES.IMOVEL : SEGURO_RATES.OUTROS;
    const seguroRate = tableMeta.seguroPct || defaultSeguroRate;
    
    const valorSeguroMensal = credito * seguroRate;

    // 2. Totais Administrativos (Apenas Informativo/Detalhamento)
    // O valor real pago está embutido na 'rawParcela', mas calculamos aqui para mostrar ao usuário.
    const taxaAdminValor = credito * tableMeta.taxaAdmin;
    const fundoReservaValor = credito * tableMeta.fundoReserva;

    // 3. Cálculo da Parcela Pré-Contemplação
    // A rawParcela vem do CSV. 
    // Se o usuário escolheu 'C/SV', a rawParcela já tem o seguro somado.
    // Se escolheu 'S/SV', ela não tem.
    // O app não altera a parcela do CSV, apenas a repassa como "Parcela Inicial".
    let parcelaPre = rawParcela;

    // 4. Lógica de Planos (Light / Super Light)
    // Define quanto do crédito é pago na parcela reduzida (Fator base)
    let fatorPlano = 1.0; // NORMAL (100%)
    if (tableMeta.plan === 'LIGHT') fatorPlano = 0.75;
    if (tableMeta.plan === 'SUPERLIGHT') fatorPlano = 0.50;

    // 5. Cálculo de Lances
    const lanceEmbutidoValor = credito * lanceEmbutidoPct;
    const lanceTotal = lanceBolso + lanceEmbutidoValor + lanceCartaVal;

    // Crédito Líquido: Quanto o cliente recebe na mão para comprar o bem.
    // Regra: Lance embutido SEMPRE desconta do crédito. 
    // Regra: Lance carta de avaliação também costuma abater do crédito disponível se usada para quitar lance.
    const creditoLiquido = credito - lanceEmbutidoValor - lanceCartaVal;

    // 6. Cenário Pós-Contemplação (Opção B - Recomposição)
    // Se o plano for Light ou SL, e o cliente quiser o crédito CHEIO (100%) na contemplação,
    // a parcela sobe para cobrir a diferença que não foi paga anteriormente.
    
    let parcelaPos = parcelaPre;

    if (tableMeta.plan !== 'NORMAL') {
      // Diferença que deixou de ser paga (ex: 25% ou 50% do crédito total)
      const diferencaCredito = credito * (1 - fatorPlano);
      
      // Essa diferença deve ser diluída no prazo restante.
      // Como é uma simulação "fria", não sabemos quando ele será contemplado.
      // A prática de mercado para simulação de venda é projetar o reajuste linear.
      // Adicionamos a diferença dividida pelo prazo total à parcela.
      // (Nota: Em produção real, seria dividido pelo prazo REMANESCENTE, que varia mês a mês).
      const acrescimo = diferencaCredito / prazo;
      
      parcelaPos = parcelaPre + acrescimo;
    }

    // 7. Custo Total Previsto
    // Considera parcelas pré-contemplação pelo prazo total (Cenário base sem reajuste antecipado)
    const custoTotal = parcelaPre * prazo;

    // 8. Mapa de Amortização Simplificado
    // Gera um array para plotar gráfico de saldo devedor vs valor pago
    const amortizacao: AmortizationRow[] = [];
    let saldoDevedorTecnico = custoTotal; 
    let acumuladoPago = 0;

    for (let i = 1; i <= prazo; i++) {
      acumuladoPago += parcelaPre;
      saldoDevedorTecnico -= parcelaPre;
      
      if (saldoDevedorTecnico < 0) saldoDevedorTecnico = 0;

      amortizacao.push({
        mes: i,
        saldoDevedor: saldoDevedorTecnico,
        valorPago: acumuladoPago
      });
    }

    return {
      parcelaPreContemplacao: parcelaPre,
      parcelaPosContemplacao: parcelaPos,
      seguroMensal: valorSeguroMensal,
      
      custoTotal,
      taxaAdminValor,
      fundoReservaValor,
      
      creditoOriginal: credito,
      creditoLiquido,
      lanceTotal,
      lanceEmbutidoValor,
      
      plano: tableMeta.plan,
      amortizacao
    };
  }

  /**
   * Valida se a simulação é possível
   */
  static validate(input: SimulationInput, tableMeta: TableMetadata): string | null {
    if (input.lanceEmbutidoPct > tableMeta.maxLanceEmbutido) {
      return `O lance embutido máximo para esta tabela é de ${(tableMeta.maxLanceEmbutido * 100).toFixed(0)}%`;
    }
    if (input.credito <= 0) return "O valor do crédito deve ser maior que zero.";
    if (input.prazo <= 0) return "Selecione um prazo válido.";
    
    return null; // Sem erros
  }
}