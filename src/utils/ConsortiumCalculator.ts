import { TableMetadata, PlanType } from '../../data/TableRepository';

export type InstallmentType = 'C/SV' | 'S/SV';

export interface SimulationInput {
  tableId: string;
  credito: number;
  prazo: number;
  tipoParcela: InstallmentType;
  lanceBolso: number;
  lanceEmbutidoPct: number;
  lanceCartaVal: number;
  taxaAdesaoPct: number;
  percentualLanceParaParcela: number; // 0 a 100
  mesContemplacao: number; 
}

export interface ContemplationScenario {
  mes: number;
  mesRelativo: number;
  novoPrazo: number;
  parcelasAbatidas: number;
  novaParcela: number;
  amortizacaoInfo: string;
  creditoEfetivo: number;
  reducaoValor?: number;
  reducaoPorcentagem?: number;
}

export interface SimulationResult {
  parcelaPreContemplacao: number;
  custoTotal: number;
  custoTotalReduzido?: number;
  custoTotalCheio?: number;
  taxaAdminValor: number;
  fundoReservaValor: number;
  seguroMensal: number;
  valorAdesao: number;
  totalPrimeiraParcela: number;
  creditoOriginal: number;
  creditoLiquido: number;
  lanceTotal: number;
  plano: PlanType;
  lanceCartaVal: number; 
  cenariosContemplacao: ContemplationScenario[]; 
  cenarioCreditoReduzido: ContemplationScenario[] | null; 
  cenarioCreditoTotal: ContemplationScenario[] | null;    
  parcelaPosCaminho2: number; 
}

export class ConsortiumCalculator {

  /**
   * Calcula a projeção linha a linha (Mês 1, Mês 2...) com base nas regras específicas.
   */
  private static calculateProjection(
    input: SimulationInput,
    tableMeta: TableMetadata,
    parcelaTabela: number,      // Parcela "crua" da tabela (reduzida se for Light/SL)
    creditoEfetivo: number,     // Crédito que o cliente pega na mão (Reduzido ou Cheio)
    gapParaCaminho2: number,    // Diferença de crédito para somar (Usado especificamente no Auto Super Light)
    lanceTotal: number,
    isCaminho2: boolean         // Flag para saber se é o Caminho 2 (Crédito Cheio)
  ): ContemplationScenario[] {

    const cenarios: ContemplationScenario[] = [];
    const mesInicial = Math.max(1, input.mesContemplacao);
    
    // Fator para converter Parcela Reduzida -> Parcela Cheia
    let fatorPlano = 1.0;
    if (tableMeta.plan === 'LIGHT') fatorPlano = 0.75;
    if (tableMeta.plan === 'SUPERLIGHT') fatorPlano = 0.50;

    // Loop para gerar 5 linhas de previsão
    for (let i = 0; i < 5; i++) {
        const mesSimulacao = mesInicial + i;
        
        // Se ultrapassou o prazo total, para.
        if (mesSimulacao > input.prazo) break;

        // 1. Definição do Prazo Restante neste mês
        const prazoRestante = Math.max(1, input.prazo - mesSimulacao);

        // 2. Definição da Parcela Base neste mês (Antes do Lance)
        let parcelaBase = parcelaTabela;

        if (isCaminho2) {
            // LÓGICA ESPECÍFICA AUTO SUPER LIGHT (Solicitada no Prompt)
            // Fórmula: Parcela Tabela + (Gap Total / Prazo Restante)
            if (gapParaCaminho2 > 0) {
                const acrescimoGap = gapParaCaminho2 / prazoRestante;
                parcelaBase = parcelaTabela + acrescimoGap;
            } 
            // LÓGICA PADRÃO PARA OUTROS PLANOS (Ex: Imóvel Super Light)
            // Fórmula: Parcela Tabela / Fator (Já inclui taxas na recomposição)
            else if (fatorPlano < 1.0) {
                parcelaBase = parcelaTabela / fatorPlano;
            }
        }

        // 3. Definição do Limite de 40%
        // A regra é estrita: 40% sobre a parcela vigente NO CAMINHO ESCOLHIDO.
        const tetoReducao = parcelaBase * 0.40;

        // 4. Aplicação do Lance
        let novaParcela = parcelaBase;
        let novoPrazo = prazoRestante;
        let info = "";
        let reducaoValor = 0;
        let reducaoPct = 0;

        if (lanceTotal > 0) {
            // Separação do dinheiro
            const pctDestinoParcela = Math.min(100, Math.max(0, input.percentualLanceParaParcela));
            const valorLanceParaParcela = lanceTotal * (pctDestinoParcela / 100);
            const valorLanceParaPrazo = lanceTotal - valorLanceParaParcela; 

            // --- CÁLCULO REDUÇÃO PARCELA ---
            // Fórmula: Valor destinado / Prazo Restante
            let reducaoCalculada = valorLanceParaParcela / prazoRestante;
            
            // Verifica Teto 40%
            let reducaoEfetiva = reducaoCalculada;
            let sobraPorTeto = 0;

            if (reducaoCalculada > tetoReducao) {
                reducaoEfetiva = tetoReducao;
                // A diferença volta para o bolo do prazo
                const valorUsado = reducaoEfetiva * prazoRestante;
                sobraPorTeto = valorLanceParaParcela - valorUsado;
                info = "Limitado 40% (Sobra p/ Prazo)";
            } else {
                info = pctDestinoParcela > 0 ? "Redução Aplicada" : "Somente Prazo";
            }

            // Aplica redução na parcela
            if (reducaoEfetiva >= parcelaBase) {
                 novaParcela = 0;
            } else {
                 novaParcela = parcelaBase - reducaoEfetiva;
            }

            reducaoValor = reducaoEfetiva;
            reducaoPct = (reducaoEfetiva / parcelaBase) * 100;

            // --- CÁLCULO REDUÇÃO PRAZO ---
            // Dinheiro disponível para prazo = Parte Original + Sobra do Teto 40%
            const totalDinheiroPrazo = valorLanceParaPrazo + sobraPorTeto;

            // Quantas parcelas NOVAS esse dinheiro paga?
            let parcelasAbatidas = 0;
            if (novaParcela > 0.01) {
                parcelasAbatidas = totalDinheiroPrazo / novaParcela;
            } else {
                parcelasAbatidas = prazoRestante; // Quitado
            }

            novoPrazo = Math.max(0, prazoRestante - parcelasAbatidas);
            
            if (novoPrazo < 0.1) info = "Quitado";
        }

        // Adiciona ao array
        cenarios.push({
            mes: mesSimulacao,
            mesRelativo: i + 1,
            novoPrazo: novoPrazo,
            parcelasAbatidas: prazoRestante - novoPrazo,
            novaParcela: novaParcela,
            amortizacaoInfo: info || "Normal",
            creditoEfetivo: creditoEfetivo,
            reducaoValor: reducaoValor,
            reducaoPorcentagem: reducaoPct
        });
    }

    return cenarios;
  }

  static calculate(input: SimulationInput, tableMeta: TableMetadata, rawParcela: number): SimulationResult {
    const { credito, prazo, lanceEmbutidoPct, lanceBolso, lanceCartaVal, tipoParcela, taxaAdesaoPct } = input;
    
    // --- Valores Fixos ---
    const seguroRate = tipoParcela === 'C/SV' ? tableMeta.seguroPct : 0;
    const seguroMensal = credito * seguroRate;
    const taxaAdminValor = credito * tableMeta.taxaAdmin;
    const fundoReservaValor = credito * tableMeta.fundoReserva;
    const valorAdesao = credito * taxaAdesaoPct;

    const lanceEmbutidoValor = credito * lanceEmbutidoPct;
    const lanceTotal = lanceBolso + lanceEmbutidoValor + lanceCartaVal; 
    const totalPrimeiraParcela = rawParcela + valorAdesao;

    // Fatores de Plano
    let fatorPlano = 1.0;
    if (tableMeta.plan === 'LIGHT') fatorPlano = 0.75;
    if (tableMeta.plan === 'SUPERLIGHT') fatorPlano = 0.50;

    // 1. CÁLCULO PLANO NORMAL
    if (tableMeta.plan === 'NORMAL') {
        const creditoLiquido = credito - lanceEmbutidoValor - lanceCartaVal;
        const custoTotal = rawParcela * prazo; 

        const cenarios = ConsortiumCalculator.calculateProjection(
            input,
            tableMeta,
            rawParcela,
            creditoLiquido,
            0, // Sem gap
            lanceTotal,
            false
        );

        return {
          parcelaPreContemplacao: rawParcela,
          custoTotal,
          custoTotalReduzido: custoTotal,
          custoTotalCheio: custoTotal,
          taxaAdminValor,
          fundoReservaValor,
          seguroMensal,
          valorAdesao,
          totalPrimeiraParcela,
          creditoOriginal: credito,
          creditoLiquido,
          lanceTotal,
          plano: tableMeta.plan,
          lanceCartaVal,
          cenariosContemplacao: cenarios,
          cenarioCreditoReduzido: null,
          cenarioCreditoTotal: null,
          parcelaPosCaminho2: 0
        };
    } 
    
    // 2. CÁLCULO PLANOS LIGHT / SUPERLIGHT (AUTO & IMOVEL)
    else {
        const mesRef = Math.max(1, input.mesContemplacao);
        const prazoRestanteRef = Math.max(1, prazo - mesRef);

        // --- CAMINHO 1: CRÉDITO REDUZIDO ---
        const creditoBaseReduzido = credito * fatorPlano;
        const creditoLiquidoReduzido = creditoBaseReduzido - lanceEmbutidoValor - lanceCartaVal;
        
        let cenarioReduzido: ContemplationScenario[] | null = null;
        let custoTotalReduzido = 0;

        // REGRA DE BLOQUEIO (Tópico 2): Se Lance > Crédito Disponível no C1, bloqueia VISUALIZAÇÃO DO C1.
        // Mas o cálculo do C2 continua possível.
        const isCaminho1Viavel = (creditoLiquidoReduzido > 0) && (lanceTotal < creditoBaseReduzido);

        if (isCaminho1Viavel) {
             cenarioReduzido = ConsortiumCalculator.calculateProjection(
                input,
                tableMeta,
                rawParcela, // Parcela Reduzida
                creditoLiquidoReduzido,
                0, // Sem Gap
                lanceTotal,
                false
            );
            // Custo C1: O que pagou até contemplar + O que falta (Parcela Reduzida * Prazo Restante)
            custoTotalReduzido = (rawParcela * mesRef) + (rawParcela * prazoRestanteRef); 
        }

        // --- CAMINHO 2: CRÉDITO CHEIO ---
        const creditoLiquidoCheio = credito - lanceEmbutidoValor - lanceCartaVal;
        
        // CONFIGURAÇÃO ESPECÍFICA PARA AUTO SUPER LIGHT
        // Se for Auto Super Light, usamos a lógica do Gap (Parcela Reduzida + Gap / Prazo)
        // Se for outros (Imóvel SL), usamos a lógica da divisão (Parcela Reduzida / Fator)
        
        let gapParaCaminho2 = 0;
        let parcelaReajustadaDisplay = 0;

        const isAutoSuperLight = tableMeta.category === 'AUTO' && tableMeta.plan === 'SUPERLIGHT';

        if (isAutoSuperLight) {
             // Lógica do Gap (Aditiva)
             gapParaCaminho2 = credito * (1 - fatorPlano);
             const acrescimoDisplay = gapParaCaminho2 / prazoRestanteRef;
             parcelaReajustadaDisplay = rawParcela + acrescimoDisplay;
        } else {
             // Lógica Padrão/Imóvel (Multiplicativa/Divisão)
             parcelaReajustadaDisplay = rawParcela / fatorPlano;
        }

        const cenarioCheio = ConsortiumCalculator.calculateProjection(
            input,
            tableMeta,
            rawParcela, // Passamos a reduzida
            creditoLiquidoCheio,
            gapParaCaminho2, // Passamos o Gap (será > 0 apenas para Auto SL)
            lanceTotal,
            true // Flag Caminho 2 (Ativa Parcela Cheia)
        );

        // Custo C2: O que pagou até agora (Reduzido) + O que falta (Cheia/Reajustada * Prazo Restante)
        const custoTotalCheio = (rawParcela * mesRef) + (parcelaReajustadaDisplay * prazoRestanteRef);

        // Escolha do default (Se C1 estiver bloqueado, mostra C2)
        const cenarioDefault = cenarioReduzido ? cenarioReduzido : cenarioCheio;
        const creditoLiquidoDefault = cenarioReduzido ? creditoLiquidoReduzido : creditoLiquidoCheio;
        const custoTotalDefault = cenarioReduzido ? custoTotalReduzido : custoTotalCheio;

        return {
            parcelaPreContemplacao: rawParcela,
            custoTotal: custoTotalDefault,
            custoTotalReduzido,
            custoTotalCheio,
            taxaAdminValor,
            fundoReservaValor,
            seguroMensal,
            valorAdesao,
            totalPrimeiraParcela,
            creditoOriginal: credito,
            creditoLiquido: creditoLiquidoDefault, 
            lanceTotal,
            plano: tableMeta.plan,
            lanceCartaVal,
            cenariosContemplacao: cenarioDefault, 
            cenarioCreditoReduzido: cenarioReduzido,
            cenarioCreditoTotal: cenarioCheio,
            parcelaPosCaminho2: parcelaReajustadaDisplay 
        };
    }
  }

  static validate(input: SimulationInput, tableMeta: TableMetadata): string | null {
    if (input.lanceEmbutidoPct > tableMeta.maxLanceEmbutido) {
      return `Máximo de lance embutido: ${(tableMeta.maxLanceEmbutido * 100).toFixed(0)}%`;
    }
    if (input.credito <= 0) return "Valor de crédito inválido.";
    
    const lanceEmbVal = input.credito * input.lanceEmbutidoPct;
    const totalLances = input.lanceBolso + lanceEmbVal + input.lanceCartaVal;
    
    // Validação de Crédito Negativo (Ainda necessária para evitar absurdos)
    const creditoTotalLiquido = input.credito - lanceEmbVal - input.lanceCartaVal;
    if (creditoTotalLiquido < 0) {
       return `Atenção: A soma dos lances supera o valor total do crédito. Simulação inviável.`;
    }

    if (totalLances >= input.credito) {
      return "A soma dos lances não pode ser igual ou maior que o crédito total.";
    }

    return null;
  }
}