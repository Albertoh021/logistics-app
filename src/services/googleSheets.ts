import Papa from 'papaparse';
import type { LogisticsRecord, GoogleSheetsConfig } from '../types';
import { generateId } from '../utils';

// Helper properties extraction
const normalizeHeader = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseMoney = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const clean = String(value).replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const parseDateFlexible = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const asText = String(value).trim();
  const br = asText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return new Date(`${y}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}T12:00:00Z`);
  }
  const parsed = new Date(asText);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const findField = (row: any, patterns: string[], fallback: any = '') => {
  const entries = Object.entries(row);
  
  // First pass: look for exact match in patterns
  for (const p of patterns) {
    const exact = entries.find(([k]) => normalizeHeader(k) === p);
    if (exact) return exact[1];
  }

  // Second pass: look for includes
  for (const p of patterns) {
    const includes = entries.find(([k]) => normalizeHeader(k).includes(p));
    if (includes) return includes[1];
  }
  
  return fallback;
};

async function fetchCsv(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
    const csvText = await response.text();
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => resolve(data || []),
      });
    });
  } catch (error) {
    console.error(`Erro ao buscar CSV da url ${url}:`, error);
    return [];
  }
}

export const fetchGoogleSheetsData = async (config: GoogleSheetsConfig): Promise<LogisticsRecord[]> => {
  const [contratos, entregas, coletas, veiculosDiario, veiculosPrevia, lancamentos] = await Promise.all([
    fetchCsv(config.urlContratos),
    fetchCsv(config.urlEntregas),
    fetchCsv(config.urlColetas),
    fetchCsv(config.urlVeiculosDiario),
    fetchCsv(config.urlVeiculosPrevia),
    config.urlLancamentos ? fetchCsv(config.urlLancamentos) : Promise.resolve([]),
  ]);

  // Combine entregas and coletas by motorista + date
  const combinedMap = new Map<string, any>();

  // Process entregas
  entregas.forEach((row) => {
    const motorista = String(findField(row, ['motorista', 'entregador', 'courier'], 'Não informado')).trim();
    const dateObj = parseDateFlexible(findField(row, ['data', 'date']));
    if (!dateObj) return;
    const dateStr = dateObj.toISOString().slice(0, 10);
    const key = `${motorista}_${dateStr}`;

    const entregue = Number(findField(row, ['entregue', 'entregas'])) || 0;
    const insucessos = Number(findField(row, ['insucesso', 'falhas'])) || 0;
    const remunMotorista = parseMoney(findField(row, ['remuneracao do motorista', 'remuneracao']));
    const valorFrete = parseMoney(findField(row, ['valor total do frete', 'frete', 'receita']));

    if (combinedMap.has(key)) {
      const existing = combinedMap.get(key);
      existing.entregas += entregue;
      existing.insucessos += insucessos;
      existing.vlrEntregas += remunMotorista;
      existing.valorFaturado += valorFrete;
    } else {
      combinedMap.set(key, {
        motorista,
        data: dateStr,
        entregas: entregue,
        insucessos: insucessos,
        vlrEntregas: remunMotorista,
        valorFaturado: valorFrete,
        coletas: 0,
        pctColetados: 0,
        vlrColetas: 0,
        bonus: 0,
        vlrSabado: 0,
        pedagio: 0,
        mudanca: 0,
        outrosValores: 0,
        descontos: 0,
      });
    }
  });

  // Process lancamentos
  lancamentos.forEach((row) => {
    const motorista = findField(row, ['motorista']);
    if (!motorista) return;

    const dateObj = parseDateFlexible(findField(row, ['data de copetencia', 'data', 'date']));
    if (!dateObj) return;

    // Aprovado check if exists
    const aprovado = findField(row, ['aprovado', 'aprovacao']);
    if (aprovado && aprovado.toUpperCase() !== 'SIM') return;

    const dateStr = dateObj.toISOString().slice(0, 10);
    const key = `${motorista}_${dateStr}`;
    const valor = parseMoney(findField(row, ['valor']));
    const tipo = String(findField(row, ['tipo de lancamento', 'tipo'])).toUpperCase();
    const desc = String(findField(row, ['descricao', 'desc'])).toUpperCase();

    if (!combinedMap.has(key)) {
      combinedMap.set(key, {
        motorista,
        data: dateStr,
        entregas: 0,
        insucessos: 0,
        vlrEntregas: 0,
        valorFaturado: 0,
        coletas: 0,
        pctColetados: 0,
        vlrColetas: 0,
        bonus: 0,
        vlrSabado: 0,
        pedagio: 0,
        mudanca: 0,
        outrosValores: 0,
        descontos: 0,
      });
    }

    const existing = combinedMap.get(key);

    if (tipo.includes('DESCONTO') || tipo.includes('DEBITO')) {
      existing.descontos += valor;
    } else {
      // It's a credit
      if (desc.includes('PEDÁGIO') || desc.includes('PEDAGIO')) {
        existing.pedagio += valor;
      } else if (desc.includes('LIDERANÇA') || desc.includes('LIDERANCA') || desc.includes('MERITOCRACIA')) {
        existing.bonus += valor;
      } else if (desc.includes('SÁBADO') || desc.includes('SABADO')) {
        existing.vlrSabado += valor;
      } else {
        existing.outrosValores += valor;
      }
    }
  });

  // Process coletas
  coletas.forEach((row) => {
    const motorista = String(findField(row, ['motorista', 'entregador', 'courier', 'portador'], 'Não informado')).trim();
    const dateObj = parseDateFlexible(findField(row, ['data', 'date']));
    if (!dateObj) return;
    const dateStr = dateObj.toISOString().slice(0, 10);
    const key = `${motorista}_${dateStr}`;

    const qtdColetas = Number(findField(row, ['qtde total', 'coletas', 'quantidade', 'qtd coleta', 'qtde coleta'])) || 0;
    const qtdPacotes = Number(findField(row, ['qtd pacote', 'qtde pacote', 'pacote'])) || 0;
    const remunMotorista = parseMoney(findField(row, ['remuneracao do motorista', 'remuneracao', 'custo']));
    const valorFrete = parseMoney(findField(row, ['valor total do frete', 'frete', 'receita'])); // Optional if coletas also have faturado

    if (combinedMap.has(key)) {
      const existing = combinedMap.get(key);
      existing.coletas += qtdColetas;
      existing.pctColetados = (existing.pctColetados || 0) + qtdPacotes;
      existing.vlrColetas += remunMotorista;
      // Optional: add to valorFaturado if there's revenue for coletas
      existing.valorFaturado += valorFrete;
    } else {
      combinedMap.set(key, {
        motorista,
        data: dateStr,
        entregas: 0,
        insucessos: 0,
        vlrEntregas: 0,
        valorFaturado: valorFrete,
        coletas: qtdColetas,
        pctColetados: qtdPacotes,
        vlrColetas: remunMotorista,
        bonus: 0,
        vlrSabado: 0,
        pedagio: 0,
        mudanca: 0,
        outrosValores: 0,
        descontos: 0,
      });
    }
  });

  // Build contratos map
  const contratosMap = new Map<string, any>();
  contratos.forEach((row) => {
    const motorista = String(findField(row, ['motorista'], 'Não informado')).trim();
    contratosMap.set(motorista, {
      tipoContrato: String(findField(row, ['tipo contrato', 'contrato', 'tipo de pagamento', 'pagamento'], 'PACOTE')).toUpperCase(),
      operacao: String(findField(row, ['operacao'], '')),
      veiculo: String(findField(row, ['veiculo', 'placa'], '')),
      regiao: String(findField(row, ['regiao'], '')),
      valorDiaria: parseMoney(findField(row, ['valor diaria', 'diaria'])),
      valorPorPacote: parseMoney(findField(row, ['valor por pacote', 'valor pacote'])),
      pacoteFlex: parseMoney(findField(row, ['pacote flex', 'flex'])),
      valorLider: parseMoney(findField(row, ['lider', 'líder'])),
      valorColetaExtra: parseMoney(findField(row, ['coleta extra'])),
    });
  });

  // Build vehicles map
  const vehiclesData = [...veiculosDiario, ...veiculosPrevia];
  const vehicleCosts = vehiclesData.map((v) => ({
    vehicle: String(findField(v, ['veiculo', 'placa', 'carro'], 'Não informado')),
    cost: 
      parseMoney(findField(v, ['combustivel', 'fuel'])) +
      parseMoney(findField(v, ['aluguel', 'rental'])) +
      parseMoney(findField(v, ['seguro', 'insurance'])) +
      parseMoney(findField(v, ['manutencao', 'maintenance'])),
  }));

  const costByVehicle = new Map<string, number>();
  vehicleCosts.forEach((v) => {
    costByVehicle.set(v.vehicle, (costByVehicle.get(v.vehicle) || 0) + v.cost);
  });

  const recordsRaw = Array.from(combinedMap.values());
  
  // Calculate usage count of each vehicle to divide costs
  const usageCount: Record<string, number> = {};
  const daysPerDriver = new Map<string, number>();
  
  recordsRaw.forEach(r => {
    const contrato = contratosMap.get(r.motorista);
    const veiculo = contrato?.veiculo || 'Não informado';
    usageCount[veiculo] = (usageCount[veiculo] || 0) + 1;
    daysPerDriver.set(r.motorista, (daysPerDriver.get(r.motorista) || 0) + 1);
  });

  // Final mapping to LogisticsRecord
  return recordsRaw.map(r => {
    const contrato = contratosMap.get(r.motorista) || { 
      tipoContrato: 'PACOTE', operacao: 'Sem contrato', veiculo: 'Não informado', 
      regiao: '', valorDiaria: 0, valorPorPacote: 0, pacoteFlex: 0, valorLider: 0, valorColetaExtra: 0 
    };
    
    const validDiarias = [70, 120, 150, 200, 230, 300, 430];
    const isDiariaFixa = validDiarias.includes(contrato.valorDiaria);

    const vlrDiaria = isDiariaFixa ? contrato.valorDiaria : 0;
    const diasTrabalhados = 1; // Since it's daily data
    const vlrDasDiarias = vlrDiaria * diasTrabalhados;
    
    // Independente de diária, o motorista ganha o valor dos pacotes entregues
    let finalVlrEntregas = r.vlrEntregas;
    
    // Regra do Pacote Flex: Se o motorista tem bônus de Pacote Flex (ex: R$ 2)
    // e realizou alguma coleta no dia, ele passa a ganhar o valor total (Valor Base + Flex) por cada pacote entregue.
    const isPacoteFlex = contrato.pacoteFlex > 0;
    if (isPacoteFlex && r.coletas > 0) {
      finalVlrEntregas = r.entregas * (contrato.valorPorPacote + contrato.pacoteFlex);
    }

    // Coletas já estão inclusas na diária, logo, o valor variável é zerado para quem tem diária
    let finalVlrColetas = isDiariaFixa ? 0 : r.vlrColetas;

    // Para quem tem a regra do Pacote Flex, eles não ganham valor extra pela coleta em si, o benefício é apenas o aumento no valor do pacote
    if (isPacoteFlex) {
      finalVlrColetas = 0;
    }

    // Regra específica: motorista com diária de 70 só recebe coletas se fizer mais de 7 (recebe R$ 10)
    if (vlrDiaria === 70 && r.coletas > 7) {
      finalVlrColetas = 10;
    }

    // As coletas extras e o valor de líder são pagos todos os dias (integralmente)
    let hardcodedLider = 0;
    let hardcodedColetaExtra = 0;

    const motoristaUpper = r.motorista.toUpperCase();
    if (motoristaUpper.includes('MRJG1998')) {
      hardcodedColetaExtra = 1050;
    }
    
    const lideres154 = ['MRJG941', 'MRJG492', 'MRJG657', 'MRJG1660', 'MRJG342', 'MRJG864'];
    if (lideres154.some(id => motoristaUpper.includes(id))) {
      hardcodedLider = 154;
    }

    if (motoristaUpper.includes('MRJG498')) {
      hardcodedLider = 230; // Wellington
    }

    const bonus = (r.bonus || 0) + contrato.valorLider + contrato.valorColetaExtra + hardcodedLider + hardcodedColetaExtra;
    const vlrSabado = r.vlrSabado || 0;
    const pedagio = r.pedagio || 0;
    const mudanca = r.mudanca || 0;
    const descontos = r.descontos || 0;
    let outrosValores = r.outrosValores || 0;
    
    // Allocate vehicle costs
    const allocatedVehicleCost = (costByVehicle.get(contrato.veiculo) || 0) / Math.max(1, usageCount[contrato.veiculo] || 1);

    // Custos da empresa (veículo) entram no vlrTotal (Custo da Empresa) mas NÃO no valor a receber da prévia do motorista.
    const vlrTotal = vlrDasDiarias + finalVlrEntregas + bonus + finalVlrColetas + vlrSabado + pedagio + mudanca + outrosValores + allocatedVehicleCost - descontos;
    const lucroBruto = r.valorFaturado - vlrTotal;

    const tckMedio = r.entregas > 0 ? vlrTotal / r.entregas : 0;
    const pctCusto = r.valorFaturado > 0 ? (vlrTotal / r.valorFaturado) * 100 : 0;

    const entregasDia = r.entregas;
    const coletasDia = r.coletas;

    return {
      id: generateId(),
      data: r.data,
      motorista: r.motorista,
      tipoContrato: isDiariaFixa ? 'DIARIA' : contrato.tipoContrato,
      veiculo: contrato.veiculo,
      operacao: contrato.operacao,
      vlrDiaria,
      diasTrabalhados,
      entregas: r.entregas,
      valorFaturado: r.valorFaturado,
      insucessos: r.insucessos,
      
      vlrDasDiarias,
      vlrEntregas: finalVlrEntregas,
      bonus,
      coletas: r.coletas,
      vlrColetas: finalVlrColetas,
      vlrSabado,
      pedagio,
      mudanca,
      outrosValores,
      custoVeiculo: allocatedVehicleCost,
      descontos,

      vlrTotal,
      tckMedio,
      lucroBruto,
      pctCusto,

      entregasDia,
      coletasDia,

      regiaoEntrega: contrato.regiao,
      cep: '',
      pctColetados: r.pctColetados || 0,
      pctPorPonto: 0
    };
  });
}
