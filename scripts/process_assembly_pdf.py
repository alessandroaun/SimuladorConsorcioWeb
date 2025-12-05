import pdfplumber
import json
import re
import os
import sys

# CONFIGURAÇÃO DE CAMINHOS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(BASE_DIR, '..', 'contemplados_geral.pdf')
JSON_PATH = os.path.join(BASE_DIR, '..', 'estatisticas_grupos.json')

def processar_pdf():
    print(f"🚀 Iniciando processamento com Python...")
    print(f"📂 Lendo arquivo: {PDF_PATH}")

    if not os.path.exists(PDF_PATH):
        print(f"❌ Erro: Arquivo '{PDF_PATH}' não encontrado.")
        return

    grupos_data = []
    grupos_processados_set = set()  # Rastreia grupos já lidos para evitar duplicidade
    
    # Variáveis de Estado
    grupo_atual = None
    dados_grupo = None
    ultimo_percentual = 0.0
    
    # Data Global
    data_assembleia_global = "-"
    encontrou_data_global = False

    # --- REGEX ---
    # Captura Grupo: "Grupo 2009", "2009 Grupo" ou "Grupo" isolado
    re_grupo = re.compile(r'(?:Grupo\s+(\d{4}))|(\d{4})\s+Grupo|^Grupo$', re.IGNORECASE)
    re_numero_isolado = re.compile(r'^(\d{4})$')
    
    # Captura Percentual (ex: 70,000000)
    re_percentual = re.compile(r'(\d{1,3},\d{4,})')
    
    # Captura Tipo de Lance
    re_tipo = re.compile(r'(Livre|Fixo|Sorteio)', re.IGNORECASE)
    
    # Captura Cotas do Grupo (Oficial)
    re_cotas_grupo = re.compile(r'Cotas\s*Grupo\s*[:.]?\s*(\d+)', re.IGNORECASE)

    # NOVO: Captura Data Oficial "Contemplação de: dd/mm/aaaa"
    # Aceita "de:" com ou sem dois pontos, e data com 2 ou 4 dígitos no ano
    re_data_header = re.compile(r'Contempla[çc][ãa]o\s*de[:\s]*(\d{2}/\d{2}/\d{2,4})', re.IGNORECASE)

    esperando_numero_grupo = False

    try:
        with pdfplumber.open(PDF_PATH) as pdf:
            total_paginas = len(pdf.pages)
            print(f"📄 O documento possui {total_paginas} páginas.")

            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue

                lines = text.split('\n')
                
                for line in lines:
                    line = line.strip()
                    if not line: 
                        continue

                    # 1. BUSCA DATA GLOBAL (Prioridade Máxima)
                    # Se ainda não encontramos a data oficial, procuramos pelo padrão "Contemplação de:"
                    if not encontrou_data_global:
                        match_dt = re_data_header.search(line)
                        if match_dt:
                            data_assembleia_global = match_dt.group(1)
                            encontrou_data_global = True
                            print(f"📅 Data Oficial detectada: {data_assembleia_global}")

                    # 2. Captura "Cotas Grupo"
                    match_cotas = re_cotas_grupo.search(line)
                    if match_cotas and dados_grupo:
                        qtd_oficial = int(match_cotas.group(1))
                        dados_grupo['qtdContempladosOficial'] = qtd_oficial

                    # 3. Identifica MUDANÇA DE GRUPO
                    match_grupo = re_grupo.search(line)
                    match_num_isolado = re_numero_isolado.search(line)
                    
                    novo_numero = None

                    if match_grupo:
                        if match_grupo.group(1) or match_grupo.group(2):
                            novo_numero = match_grupo.group(1) or match_grupo.group(2)
                        elif line.lower() == 'grupo':
                            esperando_numero_grupo = True
                            continue
                    elif esperando_numero_grupo and match_num_isolado:
                        novo_numero = match_num_isolado.group(1)
                        esperando_numero_grupo = False

                    # Processa troca de grupo
                    if novo_numero:
                        if grupo_atual and dados_grupo:
                            salvar_grupo(grupos_data, grupo_atual, dados_grupo)
                        
                        try:
                            novo_numero_int = int(novo_numero)
                            
                            if novo_numero_int in grupos_processados_set:
                                # DUPLICADO: Ignora
                                # print(f"⚠️ Grupo {novo_numero} repetido. Ignorando...") 
                                grupo_atual = novo_numero
                                dados_grupo = None 
                            else:
                                # NOVO
                                grupos_processados_set.add(novo_numero_int)
                                grupo_atual = novo_numero
                                dados_grupo = novo_estrutura_grupo()
                                ultimo_percentual = 0.0
                        except ValueError:
                            grupo_atual = novo_numero
                            dados_grupo = novo_estrutura_grupo()

                        continue

                    # 4. Processa LANCES (apenas se não for grupo ignorado/None)
                    if grupo_atual and dados_grupo:
                        
                        # Percentual
                        match_perc = re_percentual.search(line)
                        percentual_nesta_linha = 0.0
                        
                        if match_perc:
                            valor_txt = match_perc.group(1).replace(',', '.')
                            try:
                                valor_float = float(valor_txt)
                                if 0 < valor_float <= 100:
                                    ultimo_percentual = valor_float
                                    percentual_nesta_linha = valor_float
                            except ValueError:
                                pass

                        # Tipo de Lance
                        match_tipo = re_tipo.search(line)
                        if match_tipo:
                            tipo = match_tipo.group(1).lower()
                            dados_grupo['qtdContempladosManual'] += 1
                            
                            percentual_real = 0.0
                            if percentual_nesta_linha > 0:
                                percentual_real = percentual_nesta_linha
                            elif ultimo_percentual > 0:
                                percentual_real = ultimo_percentual

                            if tipo == 'fixo':
                                dados_grupo['qtdLanceFixo'] += 1
                            elif tipo == 'livre':
                                dados_grupo['qtdLanceLivre'] += 1
                                if percentual_real > 0:
                                    dados_grupo['lancesLivresValues'].append(percentual_real)

        # Salva o último grupo
        if grupo_atual and dados_grupo:
            salvar_grupo(grupos_data, grupo_atual, dados_grupo)

        # APLICA A DATA GLOBAL A TODOS OS GRUPOS
        if not encontrou_data_global:
            print("⚠️ AVISO: Não foi encontrada a frase 'Contemplação de:' com data. Usando '-' como padrão.")
        
        for gp in grupos_data:
            gp['Assembleia'] = data_assembleia_global

        # FINALIZAÇÃO
        print(f"📊 Processamento concluído!")
        print(f"   Grupos identificados: {len(grupos_data)}")
        
        if len(grupos_data) > 0:
            primeiro = grupos_data[0]
            print(f"   Amostra (Grupo {primeiro['Grupo']}):")
            print(f"     Data Aplicada: {primeiro['Assembleia']}")
            print(f"     Contemplados: {primeiro['Qtd Contemplados']}")
            print(f"     Fixos (Ajustado): {primeiro['Qtd Lance Fixo (30/45)']}")

            with open(JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump(grupos_data, f, indent=4, ensure_ascii=False)
            
            print(f"\n💾 Arquivo salvo em: {JSON_PATH}")
        else:
            print("⚠️ Nenhum dado foi extraído.")

    except Exception as e:
        print(f"❌ Erro fatal: {e}")

def novo_estrutura_grupo():
    return {
        'qtdContempladosManual': 0,
        'qtdContempladosOficial': None,
        'qtdLanceFixo': 0,
        'qtdLanceLivre': 0,
        'lancesLivresValues': []
    }

def salvar_grupo(lista, numero, dados):
    lances = dados['lancesLivresValues']
    media = 0.0
    menor = 0.0
    
    if len(lances) > 0:
        media = sum(lances) / len(lances)
        menor = min(lances)

    lances_fixos_ajustados = max(0, dados['qtdLanceFixo'] - 1)

    qtd_final_contemplados = dados['qtdContempladosOficial'] \
        if dados['qtdContempladosOficial'] is not None \
        else dados['qtdContempladosManual']

    try:
        num_grupo_int = int(numero)
        
        # O campo Assembleia será preenchido/sobrescrito no final pelo valor global
        obj = {
            "Grupo": num_grupo_int,
            "Assembleia": "-", 
            "Qtd Contemplados": qtd_final_contemplados,
            "Qtd Lance Fixo (30/45)": lances_fixos_ajustados,
            "Qtd Lance Livre": dados['qtdLanceLivre'],
            "Media Lance Livre": round(media, 4),
            "Menor Lance Livre": round(menor, 4)
        }
        lista.append(obj)
    except ValueError:
        pass

if __name__ == "__main__":
    processar_pdf()