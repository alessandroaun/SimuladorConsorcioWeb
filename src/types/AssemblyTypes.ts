export interface AssemblyGroupStats {
    grupo: string;
    totalContemplados: number;
    totalLanceFixo: number;
    totalLanceLivre: number;
    mediaLanceLivre: number;
    menorLanceLivre: number;
    maiorLanceLivre: number;
    dataAssembleia: string;
    vencimento: string; // Ex: "Dia 10" ou "Dia 15"
}
  
export interface AssemblySummary {
    ultimaAtualizacao: string;
    grupos: Record<string, AssemblyGroupStats>;
}