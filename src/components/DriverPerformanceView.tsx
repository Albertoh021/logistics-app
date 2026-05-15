import { useState, useMemo } from 'react';
import type { LogisticsRecord } from '../types';
import { Trophy, Search, ChevronDown, ChevronUp, Medal, Target, Truck, AlertTriangle } from 'lucide-react';

interface DriverPerformanceProps {
  records: LogisticsRecord[];
  darkMode: boolean;
  dateRange: string;
}

interface DriverStats {
  motorista: string;
  tipoContrato: string;
  entregas: number;
  coletas: number;
  insucessos: number;
  faturado: number;
  custo: number;
  sla: number;
  tckMedio: number;
}

export const DriverPerformanceView = ({ records, darkMode, dateRange }: DriverPerformanceProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof DriverStats, direction: 'asc' | 'desc' }>({ key: 'entregas', direction: 'desc' });

  const drivers = useMemo(() => {
    const map = new Map<string, DriverStats>();

    records.forEach(r => {
      const nome = r.motorista;
      if (!nome) return;

      if (!map.has(nome)) {
        map.set(nome, {
          motorista: nome,
          tipoContrato: r.tipoContrato || 'N/A',
          entregas: 0,
          coletas: 0,
          insucessos: 0,
          faturado: 0,
          custo: 0,
          sla: 0,
          tckMedio: 0
        });
      }

      const d = map.get(nome)!;
      d.entregas += r.entregas;
      d.coletas += r.coletas;
      d.insucessos += r.insucessos;
      d.faturado += r.valorFaturado;
      d.custo += r.vlrTotal;
    });

    return Array.from(map.values()).map(d => {
      const totalTentado = d.entregas + d.insucessos;
      d.sla = totalTentado > 0 ? (d.entregas / totalTentado) * 100 : 0;
      d.tckMedio = d.entregas > 0 ? d.custo / d.entregas : 0;
      return d;
    });
  }, [records]);

  // Top 3 criteria: Sort by Entregas descending, then SLA descending
  const podium = useMemo(() => {
    return [...drivers].sort((a, b) => {
      if (b.entregas !== a.entregas) return b.entregas - a.entregas;
      return b.sla - a.sla;
    }).slice(0, 3);
  }, [drivers]);

  const filteredAndSorted = useMemo(() => {
    let result = drivers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.motorista.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [drivers, searchQuery, sortConfig]);

  const handleSort = (key: keyof DriverStats) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof DriverStats }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-0 group-hover:opacity-20 transition-opacity"><ChevronDown size={16}/></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp size={16} className="text-rose-500" /> : <ChevronDown size={16} className="text-rose-500" />;
  };

  const panelBg = darkMode ? 'bg-slate-900/80 border-slate-800 shadow-[0_4_20px_-5px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-100 shadow-sm';
  const textTitle = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textValue = darkMode ? 'text-white' : 'text-slate-800';

  return (
    <div className={`space-y-8 animate-in fade-in duration-700 pb-12 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-600'} shadow-sm`}>
             <Trophy size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Performance da Frota</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ranking, SLA e volume operacional de cada motorista.</p>
          </div>
        </div>
        {dateRange && (
          <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}>
            <Target size={16} className={darkMode ? 'text-rose-400' : 'text-rose-500'} />
            Período: {dateRange}
          </div>
        )}
      </div>

      {/* TOP 3 PODIUM */}
      {podium.length >= 3 && (
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col items-center justify-end min-h-[300px] relative overflow-hidden ${panelBg}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-rose-500/5 to-transparent pointer-events-none"></div>
          
          <div className="w-full max-w-5xl mx-auto flex items-end justify-center gap-2 sm:gap-6 relative z-10">
            
            {/* Segundo Lugar */}
            <div className="flex flex-col items-center flex-1 max-w-[200px] hover:-translate-y-2 transition-transform cursor-default">
              <div className="mb-3 flex flex-col items-center">
                <span className={`text-xs font-black uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>2º Lugar</span>
                <div className={`p-3 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg`}>
                  <Medal size={24} />
                </div>
              </div>
              <div className={`w-full h-32 rounded-t-2xl flex flex-col items-center justify-center border-t border-l border-r ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200/50'}`}>
                <p className={`text-sm font-bold text-center px-2 line-clamp-1 ${textValue}`}>{podium[1].motorista}</p>
                <div className="mt-2 text-center">
                  <span className={`block text-[10px] uppercase font-bold opacity-60 ${textTitle}`}>SLA</span>
                  <span className={`font-black tracking-tight ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>{podium[1].sla.toFixed(1)}%</span>
                </div>
                <div className="mt-1 text-center">
                  <span className={`block text-[10px] uppercase font-bold opacity-60 ${textTitle}`}>Vol</span>
                  <span className={`font-black ${textValue}`}>{podium[1].entregas}</span>
                </div>
              </div>
            </div>

            {/* Primeiro Lugar */}
            <div className="flex flex-col items-center flex-1 max-w-[240px] z-10 hover:-translate-y-2 transition-transform cursor-default">
              <div className="mb-4 flex flex-col items-center">
                <div className="relative">
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce drop-shadow-md">👑</span>
                  <div className={`p-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl ring-4 ring-amber-500/20`}>
                    <Trophy size={36} />
                  </div>
                </div>
              </div>
              <div className={`w-full h-44 rounded-t-2xl flex flex-col items-center justify-center border-t border-l border-r shadow-lg relative overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent`}></div>
                <p className={`text-base sm:text-lg font-black text-center px-3 line-clamp-2 relative z-10 ${darkMode ? 'text-amber-400' : 'text-orange-600'}`}>{podium[0].motorista}</p>
                <div className="mt-4 text-center relative z-10">
                  <span className={`block text-[10px] uppercase font-black opacity-80 mb-0.5 ${darkMode ? 'text-amber-200' : 'text-orange-800'}`}>SLA Ouro</span>
                  <span className={`text-2xl sm:text-3xl font-black tracking-tighter ${textValue}`}>{podium[0].sla.toFixed(1)}%</span>
                </div>
                <div className="mt-2 text-center relative z-10">
                  <span className={`block text-[10px] uppercase font-black opacity-80 ${darkMode ? 'text-amber-200' : 'text-orange-800'}`}>Total Entregas</span>
                  <span className={`text-lg font-black ${darkMode ? 'text-amber-400' : 'text-orange-600'}`}>{podium[0].entregas}</span>
                </div>
              </div>
            </div>

            {/* Terceiro Lugar */}
            <div className="flex flex-col items-center flex-1 max-w-[200px] hover:-translate-y-2 transition-transform cursor-default">
              <div className="mb-3 flex flex-col items-center">
                <span className={`text-xs font-black uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>3º Lugar</span>
                <div className={`p-3 rounded-full bg-gradient-to-br from-orange-700 to-amber-800 text-white shadow-lg`}>
                  <Medal size={24} />
                </div>
              </div>
              <div className={`w-full h-28 rounded-t-2xl flex flex-col items-center justify-center border-t border-l border-r ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100/50 border-slate-200/50'}`}>
                <p className={`text-sm font-bold text-center px-2 line-clamp-1 ${textValue}`}>{podium[2].motorista}</p>
                <div className="mt-2 text-center">
                  <span className={`block text-[9px] uppercase font-bold opacity-60 ${textTitle}`}>SLA</span>
                  <span className={`font-black ${darkMode ? 'text-amber-500' : 'text-orange-600'}`}>{podium[2].sla.toFixed(1)}%</span>
                </div>
                <div className="mt-1 text-center">
                  <span className={`block text-[9px] uppercase font-bold opacity-60 ${textTitle}`}>Vol</span>
                  <span className={`font-black ${textValue}`}>{podium[2].entregas}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className={`rounded-2xl border ${panelBg} shadow-sm overflow-hidden`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${darkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50'}`}>
          <h3 className="font-bold text-lg">Tabela de Desempenho</h3>
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-4 w-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Buscar Motorista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-colors ${darkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}`}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider ${darkMode ? 'border-slate-800 text-slate-400 bg-slate-900/50' : 'border-slate-200 text-slate-500 bg-slate-50/50'}`}>
                <th className="px-6 py-4 font-black">Pos.</th>
                <th className="px-6 py-4 font-black cursor-pointer group hover:bg-slate-200/20 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('motorista')}>
                  <div className="flex items-center gap-2">Motorista <SortIcon columnKey="motorista" /></div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer group hover:bg-slate-200/20 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('entregas')}>
                  <div className="flex items-center gap-2">Entregas <SortIcon columnKey="entregas" /></div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer group hover:bg-slate-200/20 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('coletas')}>
                  <div className="flex items-center gap-2">Coletas <SortIcon columnKey="coletas" /></div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer group hover:bg-slate-200/20 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('insucessos')}>
                  <div className="flex items-center gap-2">Insucessos <SortIcon columnKey="insucessos" /></div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer group hover:bg-slate-200/20 dark:hover:bg-slate-800/50 transition-colors" onClick={() => handleSort('sla')}>
                  <div className="flex items-center gap-2">% SLA <SortIcon columnKey="sla" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredAndSorted.map((d, idx) => {
                const isSlaGood = d.sla >= 97;
                const isSlaBad = d.sla < 90;
                let slaColor = darkMode ? 'text-slate-300' : 'text-slate-700';
                
                if (isSlaGood) slaColor = darkMode ? 'text-emerald-400' : 'text-emerald-600';
                if (isSlaBad) slaColor = darkMode ? 'text-rose-400' : 'text-rose-600';

                return (
                  <tr key={d.motorista} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors`}>
                    <td className={`px-6 py-4 font-black ${idx < 3 ? 'text-rose-500' : 'opacity-40'}`}>{idx + 1}º</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-black ${textValue}`}>{d.motorista}</span>
                        <span className={`text-[10px] font-bold uppercase mt-0.5 ${textTitle}`}>{d.tipoContrato}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="opacity-40" />
                        <span className="font-extrabold text-base">{d.entregas}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold opacity-70 text-base">{d.coletas}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {d.insucessos > 0 && <AlertTriangle size={14} className={darkMode ? 'text-rose-500/50' : 'text-rose-500/50'} />}
                        <span className={`font-bold text-base ${d.insucessos > 0 ? (darkMode ? 'text-rose-400' : 'text-rose-600') : 'opacity-70'}`}>
                          {d.insucessos}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-lg ${slaColor}`}>{d.sla.toFixed(2)}%</span>
                        {/* Progress Bar Mini */}
                        <div className={`w-20 h-2 rounded-full ${darkMode ? 'bg-slate-800/80' : 'bg-slate-200'} overflow-hidden shrink-0 hidden sm:block`}>
                           <div className={`h-full rounded-full transition-all duration-1000 ${isSlaGood ? 'bg-emerald-500' : isSlaBad ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${d.sla}%` }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center opacity-50 font-medium">Nenhum motorista encontrado na pesquisa.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
