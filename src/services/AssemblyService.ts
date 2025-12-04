import { AssemblyGroupStats, AssemblySummary } from '../types/AssemblyTypes';

// SIMULAÇÃO DO CONTEÚDO EXTRAÍDO DO PDF QUE VOCÊ ENVIOU
// Num cenário real, você usaria uma lib como 'pdfjs-dist' para obter essa string do arquivo.
const MOCK_PDF_TEXT = `
DATA: 15/11/2025

GRUPO: 2009
Cota: 0809 - LANCE LIVRE - 70.0000%
Cota: 1048 - LANCE LIVRE - 70.0000%
Cota: 1136 - LANCE FIXO - 25.0000%

GRUPO: 5115
Cota: 0100 - LANCE LIVRE - 55.0200%
Cota: 0200 - LANCE LIVRE - 45.8500%
Cota: 0300 - LANCE FIXO - 30.0000%
Cota: 0301 - LANCE FIXO - 45.0000%

GRUPO: 5116
Cota: 1090 - LANCE LIVRE - 72.2800%
Cota: 0034 - LANCE LIVRE - 68.5000%

GRUPO: 5121
Cota: 0012 - LANCE LIVRE - 33.0000%
Cota: 0099 - LANCE LIVRE - 29.5000%
Cota: 0150 - LANCE FIXO - 45.0000%
Cota: 0151 - LANCE FIXO - 45.0000%
`;

export const AssemblyService = {
  
  // Função que seria chamada ao carregar a tela
  async fetchLatestStats(): Promise<AssemblySummary> {
    try {
      // Simula um delay de rede
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Processa o texto simulado
      return this.processPDFText(MOCK_PDF_TEXT);
    } catch (error) {
      console.error("Erro ao processar dados da assembleia:", error);
      return { ultimaAtualizacao: '', grupos: {} };
    }
  },

  // Lógica principal de interpretação (Regex)
  processPDFText(text: string): AssemblySummary {
    const lines = text.split('\n');
    const stats: Record<string, AssemblyGroupStats> = {};
    
    let currentGroup = '';
    let currentDate = '15/11/2025'; // Padrão caso não ache

    lines.forEach(line => {
      const cleanLine = line.trim().toUpperCase();

      // 1. Identificar Data
      if (cleanLine.includes('DATA:')) {
          const dateMatch = cleanLine.match(/DATA:\s*(\d{2}\/\d{2}\/\d{4})/);
          if (dateMatch) currentDate = dateMatch[1];
      }

      // 2. Identificar Grupo
      // Procura por "GRUPO: 2009" ou apenas "GRUPO 2009"
      const groupMatch = cleanLine.match(/GRUPO[:\s]+(\d{4})/);
      if (groupMatch) {
        currentGroup = groupMatch[1];
        
        // Inicializa o objeto se não existir
        if (!stats[currentGroup]) {
          stats[currentGroup] = {
            grupo: currentGroup,
            dataAssembleia: currentDate,
            vencimento: this.calculateDueDate(currentGroup),
            totalContemplados: 0,
            totalLanceFixo: 0,
            totalLanceLivre: 0,
            mediaLanceLivre: 0,
            menorLanceLivre: 100,
            maiorLanceLivre: 0,
            // @ts-ignore (propriedade temporária interna)
            _lancesLivresValues: [] 
          };
        }
      }

      // 3. Identificar Lances dentro do Grupo
      if (currentGroup && stats[currentGroup]) {
        // Regex para capturar: Tipo (LIVRE/FIXO) e Porcentagem
        const isLivre = cleanLine.includes('LANCE LIVRE');
        const isFixo = cleanLine.includes('LANCE FIXO');
        
        // Captura porcentagem: ex "70.0000%" ou "70,00%"
        const pctMatch = cleanLine.match(/(\d{1,3}[.,]\d{1,4})%/);
        
        if (pctMatch && (isLivre || isFixo)) {
            const pctValue = parseFloat(pctMatch[1].replace(',', '.'));
            const groupStat = stats[currentGroup];

            groupStat.totalContemplados++;

            if (isFixo) {
                groupStat.totalLanceFixo++;
            } else if (isLivre) {
                groupStat.totalLanceLivre++;
                (groupStat as any)._lancesLivresValues.push(pctValue);
                
                // Atualiza min/max
                if (pctValue > groupStat.maiorLanceLivre) groupStat.maiorLanceLivre = pctValue;
                if (pctValue < groupStat.menorLanceLivre) groupStat.menorLanceLivre = pctValue;
            }
        }
      }
    });

    // 4. Calcular Médias Finais
    Object.keys(stats).forEach(key => {
        const item = stats[key];
        const values = (item as any)._lancesLivresValues as number[];
        
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            item.mediaLanceLivre = sum / values.length;
        } else {
            item.menorLanceLivre = 0; // Reset se não houve lance livre
        }
        
        delete (item as any)._lancesLivresValues; // Limpeza
    });

    return {
        ultimaAtualizacao: currentDate,
        grupos: stats
    };
  },

  // Lógica simples para estimar vencimento baseado no número do grupo (Par/Impar)
  // Você pode ajustar isso conforme a regra real da Recon
  calculateDueDate(groupNumber: string): string {
      const num = parseInt(groupNumber, 10);
      return num % 2 === 0 ? "Dia 10" : "Dia 15";
  }
};