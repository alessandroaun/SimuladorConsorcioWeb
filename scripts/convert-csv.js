// scripts/convert-csv.js
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const inputDir = path.join(__dirname, '../src/data/raw');
const outputDir = path.join(__dirname, '../src/data/json');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.csv'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(inputDir, file), 'utf-8');

  // Parsear CSV (delimitador ponto e vírgula)
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    trim: true
  });

  // Tratamento específico para normalizar os dados
  // Transforma colunas "80 Meses", "72 Meses" em um array de objetos
  const cleanData = records.map(row => {
    const credito = parseFloat(row['CRÉDITO']?.replace('R$ ', '').replace('.', '').replace(',', '.') || 0);
    const prazos = [];

    Object.keys(row).forEach(key => {
      if (key.toLowerCase().includes('meses')) {
        const val = row[key];
        if (val && val !== '-') {
           const valorParcela = parseFloat(val.replace('R$ ', '').replace('.', '').replace(',', '.'));
           prazos.push({
             prazo: parseInt(key.replace(/\D/g, '')),
             parcela: valorParcela,
             // Logica para identificar C/SV ou S/SV se a linha tiver coluna TIPO
             tipo: row['TIPO'] || 'N/A'
           });
        }
      }
    });

    return { credito, prazos };
  });

  fs.writeFileSync(
    path.join(outputDir, file.replace('.csv', '.json')), 
    JSON.stringify(cleanData, null, 2)
  );
  console.log(`Convertido: ${file}`);
});