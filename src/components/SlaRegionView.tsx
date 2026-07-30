import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { LogisticsRecord } from '../types';

interface SlaRegionViewProps {
  records: LogisticsRecord[];
  darkMode: boolean;
  dateRange: string;
}

export const SlaRegionView: React.FC<SlaRegionViewProps> = ({ records, darkMode, dateRange }) => {
  const regionStats = useMemo(() => {
    const stats: Record<string, { entregas: number; insucessos: number }> = {};
    
    records.forEach(r => {
      // Ignora se não houver tentativas
      if ((r.entregas || 0) === 0 && (r.insucessos || 0) === 0) return;
      
      const region = r.regiaoEntrega?.trim() || 'Não Informada';
      if (!stats[region]) {
        stats[region] = { entregas: 0, insucessos: 0 };
      }
      stats[region].entregas += (r.entregas || 0);
      stats[region].insucessos += (r.insucessos || 0);
    });

    const formatted = Object.entries(stats).map(([name, data]) => {
      const total = data.entregas + data.insucessos;
      const sla = total > 0 ? (data.entregas / total) * 100 : 0;
      return {
        name,
        ...data,
        total,
        sla: Number(sla.toFixed(2))
      };
    });

    // Ordenar do pior para o melhor SLA para chamar atenção aos problemas primeiro na TV
    return formatted.sort((a, b) => a.sla - b.sla); 
  }, [records]);

  const globalEntregas = regionStats.reduce((sum, item) => sum + item.entregas, 0);
  const globalInsucessos = regionStats.reduce((sum, item) => sum + item.insucessos, 0);
  const globalTotal = globalEntregas + globalInsucessos;
  const globalSla = globalTotal > 0 ? (globalEntregas / globalTotal) * 100 : 0;

  const getStatusColor = (sla: number) => {
    if (sla >= 97.5) return darkMode ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-400 text-emerald-700';
    if (sla >= 90) return darkMode ? 'bg-amber-900/20 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-700';
    return darkMode ? 'bg-rose-900/20 border-rose-500/50 text-rose-400' : 'bg-rose-50 border-rose-400 text-rose-700';
  };

  const getStatusIcon = (sla: number) => {
    if (sla >= 97.5) return <CheckCircle2 className="w-8 h-8 opacity-75" />;
    if (sla >= 90) return <AlertTriangle className="w-8 h-8 opacity-75" />;
    return <AlertOctagon className="w-8 h-8 opacity-75 animate-pulse" />;
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Header TV-friendly */}
      <div className={`p-4 rounded-2xl border shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="text-center md:text-left">
          <h2 className={`text-3xl md:text-4xl font-black flex items-center justify-center md:justify-start gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Target className={`w-10 h-10 ${darkMode ? 'text-indigo-500' : 'text-indigo-600'}`} />
            Monitoramento de SLA
          </h2>
          <p className={`text-lg mt-1 font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {dateRange} • Visão Painel (Galpão)
          </p>
        </div>
        
        <div className={`px-6 py-3 rounded-2xl flex items-center gap-4 shadow-inner ${
          globalSla >= 97.5 
            ? (darkMode ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')
            : globalSla >= 90 
              ? (darkMode ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300')
              : (darkMode ? 'bg-rose-900/40 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-300')
        }`}>
          <div className="text-right">
            <span className="block text-xs font-black uppercase tracking-widest opacity-80 mb-0.5">Global da Frota</span>
            <span className="text-4xl md:text-5xl font-black tracking-tighter">{globalSla.toFixed(1)}%</span>
          </div>
          {globalSla >= 97.5 ? <TrendingUp className="w-12 h-12 opacity-80" /> : <TrendingDown className="w-12 h-12 opacity-80" />}
        </div>
      </div>

      {/* Grid de Regiões para TV */}
      {regionStats.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4 auto-rows-fr">
          {regionStats.map((region, idx) => (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition-all duration-500 transform shadow-md ${getStatusColor(region.sla)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold leading-tight break-words max-w-[75%] uppercase tracking-wide">
                  {region.name}
                </h3>
                <div className="scale-75 origin-top-right">
                  {getStatusIcon(region.sla)}
                </div>
              </div>
              
              <div className="my-2 flex flex-col items-center justify-center">
                <span className="text-5xl font-black tracking-tighter drop-shadow-sm">
                  {region.sla.toFixed(0)}<span className="text-2xl">%</span>
                </span>
              </div>
              
              <div className={`grid grid-cols-2 gap-2 p-2 rounded-xl ${darkMode ? 'bg-black/20' : 'bg-white/60 backdrop-blur-md'}`}>
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold uppercase opacity-70 mb-0.5">Sucesso</span>
                  <span className="text-xl font-black">{region.entregas}</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center border-l-2 border-current border-opacity-20 pl-1">
                  <span className="text-[10px] font-bold uppercase opacity-70 mb-0.5">Falha</span>
                  <span className="text-xl font-black">{region.insucessos}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`flex-1 flex flex-col items-center justify-center p-20 rounded-3xl border-4 border-dashed ${darkMode ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
          <Target className="w-32 h-32 mb-8 opacity-20" />
          <p className="text-3xl font-bold">Nenhum dado encontrado para o período selecionado.</p>
        </div>
      )}
    </div>
  );
};
