import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

    return formatted.sort((a, b) => b.sla - a.sla); // sort by SLA descending
  }, [records]);

  const globalEntregas = regionStats.reduce((sum, item) => sum + item.entregas, 0);
  const globalInsucessos = regionStats.reduce((sum, item) => sum + item.insucessos, 0);
  const globalTotal = globalEntregas + globalInsucessos;
  const globalSla = globalTotal > 0 ? (globalEntregas / globalTotal) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-xl shadow-lg border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <p className="font-bold text-lg mb-2">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>SLA:</span>
              <span className="font-semibold">{payload[0].value}%</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Entregas:</span>
              <span className="font-semibold text-emerald-500">{payload[0].payload.entregas}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Insucessos:</span>
              <span className="font-semibold text-rose-500">{payload[0].payload.insucessos}</span>
            </p>
            <p className="flex justify-between gap-4 pt-1 border-t border-slate-700/50 mt-1">
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Total:</span>
              <span className="font-semibold">{payload[0].payload.total}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const getSlaColor = (sla: number) => {
    if (sla >= 98) return darkMode ? '#10b981' : '#059669'; // Emerald
    if (sla >= 95) return darkMode ? '#f59e0b' : '#d97706'; // Amber
    return darkMode ? '#ef4444' : '#dc2626'; // Rose
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            <Target className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
            SLA por Região
          </h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            Análise de entregas vs insucessos ({dateRange})
          </p>
        </div>
        <div className={`px-6 py-3 rounded-xl border flex flex-col items-end shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>SLA Global</span>
          <span className={`text-3xl font-black ${globalSla >= 95 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {globalSla.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <h3 className={`text-lg font-semibold mb-6 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Desempenho Regional (SLA %)</h3>
          <div className="h-[450px] w-full">
            {regionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionStats} margin={{ top: 20, right: 30, left: 0, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={darkMode ? '#94a3b8' : '#64748b'} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke={darkMode ? '#94a3b8' : '#64748b'}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: darkMode ? '#334155' : '#f1f5f9', opacity: 0.4 }} />
                  <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'Meta (95%)', fill: '#f59e0b', fontSize: 12, offset: 10 }} />
                  <Bar dataKey="sla" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {regionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSlaColor(entry.sla)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex items-center justify-center ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Não há dados suficientes para gerar o gráfico.
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className={`p-6 rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[530px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Detalhamento ({regionStats.length} Regiões)</h3>
          <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
            {regionStats.map((region, idx) => (
              <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold truncate max-w-[65%] ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} title={region.name}>
                    {region.name}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-sm font-bold flex items-center gap-1 shrink-0 ${
                    region.sla >= 95 
                      ? (darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
                      : (darkMode ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-700')
                  }`}>
                    {region.sla >= 95 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {region.sla}%
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-white'} flex flex-col items-center justify-center text-center`}>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Entregas</span>
                    <span className="font-semibold text-emerald-500 text-base">{region.entregas}</span>
                  </div>
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-white'} flex flex-col items-center justify-center text-center`}>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Insucessos</span>
                    <span className="font-semibold text-rose-500 text-base">{region.insucessos}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {regionStats.length === 0 && (
              <div className={`text-center py-10 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Nenhum dado encontrado para o período.
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};
