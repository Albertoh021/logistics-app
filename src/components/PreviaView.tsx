import { useState, useMemo } from 'react';
import type { LogisticsRecord } from '../types';
import { formatCurrency } from '../utils';
import { Search, User, Calendar, Receipt, Info } from 'lucide-react';

interface PreviaViewProps {
  records: LogisticsRecord[];
  startDate: string;
  endDate: string;
  darkMode: boolean;
}

export const PreviaView = ({ records, startDate, endDate, darkMode }: PreviaViewProps) => {
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filtrar records pelas datas ativas globais
  const recordsInPeriod = useMemo(() => {
    return records.filter(r => {
      if (!r.data) return true;
      const rDate = r.data;
      if (startDate && rDate < startDate) return false;
      if (endDate && rDate > endDate) return false;
      return true;
    });
  }, [records, startDate, endDate]);

  // 2. Extrair a lista de motoristas únicos no período para o dropdown/busca
  const uniqueMotoristas = useMemo(() => {
    const map = new Map<string, string>();
    recordsInPeriod.forEach(r => {
      map.set(r.motorista, r.motorista);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [recordsInPeriod]);

  // 3. Filtrar pelo motorista selecionado
  const driverRecords = useMemo(() => {
    if (!selectedMotorista) return [];
    return recordsInPeriod
      .filter(r => r.motorista === selectedMotorista)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [recordsInPeriod, selectedMotorista]);

  // Filtro de busca de motorista
  const filteredMotoristas = uniqueMotoristas.filter(m => 
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Totais do motorista selecionado (usamos a regra vlrTotal - custoVeiculo para saber o valor a receber líquido dele,
  // ou somamos os campos de ganho diretamente).
  const totalDiarias = driverRecords.reduce((acc, r) => acc + r.vlrDasDiarias, 0);
  const totalEntregas = driverRecords.reduce((acc, r) => acc + r.vlrEntregas, 0);
  const totalColetas = driverRecords.reduce((acc, r) => acc + r.vlrColetas, 0);
  const totalBonus = driverRecords.reduce((acc, r) => acc + r.bonus, 0);
  const totalSabado = driverRecords.reduce((acc, r) => acc + r.vlrSabado, 0);
  const totalOutros = driverRecords.reduce((acc, r) => acc + r.outrosValores, 0); // OutrosValores não contém custoVeiculo mais
  const totalDescontos = driverRecords.reduce((acc, r) => acc + r.descontos, 0);
  const totalPedagioMudanca = driverRecords.reduce((acc, r) => acc + r.pedagio + r.mudanca, 0);

  const valorTotalAReceber = 
    totalDiarias + totalEntregas + totalColetas + totalBonus + totalSabado + totalOutros + totalPedagioMudanca - totalDescontos;

  const panelBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textTitle = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textValue = darkMode ? 'text-slate-100' : 'text-slate-800';

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      
      {/* Header e Seleção de Motorista */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-sm ${panelBg}`}>
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${textValue}`}>
            <Receipt className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
            Prévia de Repasse
          </h2>
          <p className={`text-sm mt-1 ${textTitle}`}>
            Selecione um motorista para ver o extrato detalhado diário do período selecionado.
          </p>
        </div>

        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <input
            type="text"
            className={`w-full pl-10 pr-3 py-3 rounded-xl text-sm font-medium border focus:ring-2 outline-none transition-all ${
              darkMode 
                ? 'bg-slate-950 border-slate-700 focus:ring-indigo-500 text-white placeholder-slate-500' 
                : 'bg-slate-50 border-slate-200 focus:ring-indigo-500 text-slate-800 placeholder-slate-400'
            }`}
            placeholder="Buscar motorista..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Auto-select if exact match or reset if they start typing
              if (!e.target.value) setSelectedMotorista('');
            }}
          />
          
          {/* Dropdown de Resultados da Busca */}
          {searchQuery && !selectedMotorista && (
            <div className={`absolute top-full mt-2 w-full max-h-60 overflow-y-auto rounded-xl border shadow-xl z-50 ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              {filteredMotoristas.length === 0 ? (
                <div className={`p-4 text-sm text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nenhum motorista encontrado no período.
                </div>
              ) : (
                filteredMotoristas.map(m => (
                  <div
                    key={m}
                    className={`p-3 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${
                      darkMode 
                        ? 'border-slate-700 hover:bg-slate-700 text-slate-200' 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => {
                      setSelectedMotorista(m);
                      setSearchQuery('');
                    }}
                  >
                    {m}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Extrato do Motorista */}
      {selectedMotorista && (
        <div className="space-y-6">
          
          {/* Resumo do Repasse */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`md:col-span-2 p-6 rounded-2xl border flex flex-col justify-center shadow-sm relative overflow-hidden ${panelBg}`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <User size={120} />
              </div>
              <div className="relative z-10">
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textTitle}`}>Motorista Selecionado</p>
                <h3 className={`text-2xl font-black mb-4 ${textValue}`}>{selectedMotorista}</h3>
                <div className="flex gap-6">
                  <div>
                    <p className={`text-xs uppercase font-semibold ${textTitle}`}>Período</p>
                    <p className={`text-sm font-medium ${textValue}`}>
                      {startDate ? formatDateBR(startDate) : 'Início'} até {endDate ? formatDateBR(endDate) : 'Hoje'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs uppercase font-semibold ${textTitle}`}>Dias Trabalhados</p>
                    <p className={`text-sm font-medium ${textValue}`}>{driverRecords.length} dias</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-2xl border flex flex-col justify-center shadow-sm relative overflow-hidden ${
              darkMode 
                ? 'bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/30' 
                : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200'
            }`}>
              <div className="relative z-10">
                <p className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-indigo-300' : 'text-indigo-600'
                }`}>
                  Valor Líquido a Receber
                </p>
                <h3 className={`text-4xl font-black ${
                  valorTotalAReceber >= 0 
                    ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') 
                    : (darkMode ? 'text-red-400' : 'text-red-600')
                }`}>
                  {formatCurrency(valorTotalAReceber)}
                </h3>
              </div>
            </div>
          </div>

          {/* Tabela Diária */}
          <div className={`rounded-2xl border shadow-sm overflow-hidden ${panelBg}`}>
            <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-semibold flex items-center gap-2 ${textValue}`}>
                <Calendar size={18} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                Extrato Diário
              </h3>
              <button 
                onClick={() => setSelectedMotorista('')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Trocar Motorista
              </button>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap text-sm min-w-max">
                <thead className={`text-[10px] uppercase font-bold tracking-wider ${
                  darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <tr>
                    <th className="p-3 pl-4">Data</th>
                    <th className="p-3 text-center">Entregas</th>
                    <th className="p-3 text-right">Vlr Entregas</th>
                    <th className="p-3 text-right">Diária</th>
                    <th className="p-3 text-right">Bônus</th>
                    <th className="p-3 text-right">Vlr Coletas</th>
                    <th className="p-3 text-right">Vlr Sábado</th>
                    <th className="p-3 text-right">Outros/Ped/Mud</th>
                    <th className="p-3 text-right">Descontos</th>
                    <th className="p-3 pr-4 text-right">Total Dia</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                  {driverRecords.map((r, idx) => {
                    const diaPedMudOutros = r.pedagio + r.mudanca + r.outrosValores;
                    // O custo veículo não entra aqui porque é custo da empresa.
                    const recebivelDia = r.vlrDasDiarias + r.vlrEntregas + r.bonus + r.vlrColetas + r.vlrSabado + diaPedMudOutros - r.descontos;
                    
                    return (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className={`p-3 pl-4 font-medium ${textValue}`}>{formatDateBR(r.data)}</td>
                        <td className={`p-3 text-center ${textTitle}`}>{r.entregas}</td>
                        <td className={`p-3 text-right ${r.vlrEntregas > 0 ? (darkMode ? 'text-indigo-400' : 'text-indigo-600') : textTitle}`}>
                          {r.vlrEntregas > 0 ? formatCurrency(r.vlrEntregas) : '-'}
                        </td>
                        <td className={`p-3 text-right ${textTitle}`}>
                          {r.vlrDasDiarias > 0 ? formatCurrency(r.vlrDasDiarias) : '-'}
                        </td>
                        <td className={`p-3 text-right ${r.bonus > 0 ? (darkMode ? 'text-amber-400' : 'text-amber-600') : textTitle}`}>
                          {r.bonus > 0 ? formatCurrency(r.bonus) : '-'}
                        </td>
                        <td className={`p-3 text-right ${textTitle}`}>
                          {r.vlrColetas > 0 ? formatCurrency(r.vlrColetas) : '-'}
                        </td>
                        <td className={`p-3 text-right ${textTitle}`}>
                          {r.vlrSabado > 0 ? formatCurrency(r.vlrSabado) : '-'}
                        </td>
                        <td className={`p-3 text-right ${textTitle}`}>
                          {diaPedMudOutros > 0 ? formatCurrency(diaPedMudOutros) : '-'}
                        </td>
                        <td className={`p-3 text-right ${r.descontos > 0 ? (darkMode ? 'text-red-400' : 'text-red-500') : textTitle}`}>
                          {r.descontos > 0 ? `-${formatCurrency(r.descontos)}` : '-'}
                        </td>
                        <td className={`p-3 pr-4 text-right font-bold ${
                          recebivelDia >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-red-400' : 'text-red-500')
                        }`}>
                          {formatCurrency(recebivelDia)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className={`text-xs font-bold ${darkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
                  <tr>
                    <td colSpan={2} className="p-3 pl-4 text-right">TOTAIS:</td>
                    <td className="p-3 text-right">{formatCurrency(totalEntregas)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalDiarias)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalBonus)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalColetas)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalSabado)}</td>
                    <td className="p-3 text-right">{formatCurrency(totalOutros + totalPedagioMudanca)}</td>
                    <td className="p-3 text-right text-red-500">-{formatCurrency(totalDescontos)}</td>
                    <td className="p-3 pr-4 text-right text-emerald-500">{formatCurrency(valorTotalAReceber)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
        </div>
      )}

      {/* Info Box */}
      {!selectedMotorista && (
        <div className={`p-6 rounded-2xl border flex items-start gap-4 ${darkMode ? 'bg-indigo-900/20 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
          <Info size={24} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold mb-1">Como funciona a Prévia?</h4>
            <p className="text-sm opacity-90 leading-relaxed">
              Esta tela não aplica agrupamentos ou filtros de colunas da aba Planilha. Ela exibe exatamente 
              os dias informados nos relatórios originais dentro do intervalo de datas selecionado no topo da página. 
              Os Custos Operacionais da Empresa (como aluguel de veículo, seguro e combustível) <strong>não são descontados</strong> aqui, 
              pois esta visão é exclusiva para consultar o valor líquido a ser repassado para o portador.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
