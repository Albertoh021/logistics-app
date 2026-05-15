import { useState, useMemo } from 'react';
import type { LogisticsRecord } from '../types';
import { formatCurrency } from '../utils';
import { Search, User, Calendar, Receipt, Info, Download, FileArchive } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface PreviaViewProps {
  records: LogisticsRecord[];
  startDate: string;
  endDate: string;
  darkMode: boolean;
  onUpdateRecord: (id: string, field: keyof LogisticsRecord, value: string | number) => void;
}

export const PreviaView = ({ records, startDate, endDate, darkMode, onUpdateRecord }: PreviaViewProps) => {
  const [selectedMotorista, setSelectedMotorista] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
    if (!selectedMotorista || selectedMotorista === 'TODOS OS MOTORISTAS') return [];
    return recordsInPeriod
      .filter(r => r.motorista === selectedMotorista)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [recordsInPeriod, selectedMotorista]);

  // Filtro de busca de motorista
  const filteredMotoristas = ['TODOS OS MOTORISTAS', ...uniqueMotoristas].filter(m => 
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Totais do motorista selecionado
  const totalDiarias = driverRecords.reduce((acc, r) => acc + r.vlrDasDiarias, 0);
  const totalEntregas = driverRecords.reduce((acc, r) => acc + r.vlrEntregas, 0);
  const totalColetas = driverRecords.reduce((acc, r) => acc + r.vlrColetas, 0);
  const totalBonus = driverRecords.reduce((acc, r) => acc + r.bonus, 0);
  const totalSabado = driverRecords.reduce((acc, r) => acc + r.vlrSabado, 0);
  const totalOutros = driverRecords.reduce((acc, r) => acc + r.outrosValores, 0); 
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

  // Resumo para visão "TODOS OS MOTORISTAS"
  const summaryAll = useMemo(() => {
    if (selectedMotorista !== 'TODOS OS MOTORISTAS') return [];
    return uniqueMotoristas.map(m => {
      const recs = recordsInPeriod.filter(r => r.motorista === m);
      const dias = recs.length;
      const recsTotal = recs.reduce((acc, r) => {
        const d = r.vlrDasDiarias + r.vlrEntregas + r.bonus + r.vlrColetas + r.vlrSabado + r.pedagio + r.mudanca + r.outrosValores - r.descontos;
        return acc + d;
      }, 0);
      return { motorista: m, dias, total: recsTotal };
    });
  }, [selectedMotorista, uniqueMotoristas, recordsInPeriod]);

  const totalGeralFolha = summaryAll.reduce((acc, s) => acc + s.total, 0);

  const generatePDF = (motoristaName: string, motoristaRecords: LogisticsRecord[], asBlob = false) => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Extrato de Repasse Diario', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Motorista: ${motoristaName}`, 14, 30);
    doc.text(`Periodo: ${startDate ? formatDateBR(startDate) : 'Inicio'} ate ${endDate ? formatDateBR(endDate) : 'Hoje'}`, 14, 36);

    const tEntregas = motoristaRecords.reduce((acc, r) => acc + r.vlrEntregas, 0);
    const tDiarias = motoristaRecords.reduce((acc, r) => acc + r.vlrDasDiarias, 0);
    const tBonus = motoristaRecords.reduce((acc, r) => acc + r.bonus, 0);
    const tColetas = motoristaRecords.reduce((acc, r) => acc + r.vlrColetas, 0);
    const tSabado = motoristaRecords.reduce((acc, r) => acc + r.vlrSabado, 0);
    const tOutros = motoristaRecords.reduce((acc, r) => acc + r.pedagio + r.mudanca + r.outrosValores, 0);
    const tDescontos = motoristaRecords.reduce((acc, r) => acc + r.descontos, 0);
    const tGeral = tDiarias + tEntregas + tBonus + tColetas + tSabado + tOutros - tDescontos;

    const tableData = motoristaRecords.map(r => {
      const diaPedMudOutros = r.pedagio + r.mudanca + r.outrosValores;
      const recebivelDia = r.vlrDasDiarias + r.vlrEntregas + r.bonus + r.vlrColetas + r.vlrSabado + diaPedMudOutros - r.descontos;
      return [
        formatDateBR(r.data),
        r.entregas.toString(),
        formatCurrency(r.vlrEntregas),
        formatCurrency(r.vlrDasDiarias),
        formatCurrency(r.bonus),
        formatCurrency(r.vlrColetas),
        formatCurrency(r.vlrSabado),
        formatCurrency(diaPedMudOutros),
        formatCurrency(r.descontos),
        formatCurrency(recebivelDia)
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Vol', 'Vlr Ent', 'Diaria', 'Bonus', 'Coletas', 'Sabado', 'Outros', 'Desc.', 'Total']],
      body: tableData,
      foot: [[
        'TOTAIS', 
        motoristaRecords.reduce((acc, r) => acc + r.entregas, 0).toString(),
        formatCurrency(tEntregas),
        formatCurrency(tDiarias),
        formatCurrency(tBonus),
        formatCurrency(tColetas),
        formatCurrency(tSabado),
        formatCurrency(tOutros),
        formatCurrency(tDescontos),
        formatCurrency(tGeral)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] }, 
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
      styles: { fontSize: 8 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text(`Valor Liquido a Receber: ${formatCurrency(tGeral)}`, 14, finalY);

    if (asBlob) {
      return doc.output('blob');
    } else {
      doc.save(`Extrato_${motoristaName.replace(/\s+/g, '_')}.pdf`);
    }
  };

  const handleDownloadSinglePdf = () => {
    if (!selectedMotorista || selectedMotorista === 'TODOS OS MOTORISTAS') return;
    generatePDF(selectedMotorista, driverRecords);
  };

  const handleDownloadAllZip = async () => {
    setIsGeneratingPdf(true);
    try {
      const zip = new JSZip();
      
      uniqueMotoristas.forEach(m => {
        const recs = recordsInPeriod.filter(r => r.motorista === m).sort((a, b) => a.data.localeCompare(b.data));
        if (recs.length > 0) {
          const blob = generatePDF(m, recs, true);
          zip.file(`Extrato_${m.replace(/\s+/g, '_')}.pdf`, blob as Blob);
        }
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `Extratos_Todos_Motoristas_${startDate || 'Inicio'}_${endDate || 'Fim'}.zip`;
      saveAs(content, fileName);
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar o arquivo ZIP com os relatórios.');
    } finally {
      setIsGeneratingPdf(false);
    }
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
            Selecione um motorista ou veja o resumo de todos para gerar PDFs de pagamento.
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
            placeholder="Buscar motorista ou TODOS..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
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
                filteredMotoristas.map((m, idx) => (
                  <div
                    key={m}
                    className={`p-3 text-sm cursor-pointer transition-colors border-b last:border-b-0 ${
                      darkMode 
                        ? 'border-slate-700 hover:bg-slate-700 text-slate-200' 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    } ${idx === 0 && m === 'TODOS OS MOTORISTAS' ? (darkMode ? 'bg-indigo-900/40 text-indigo-300 font-bold' : 'bg-indigo-50 text-indigo-700 font-bold') : ''}`}
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

      {/* Visão de TODOS OS MOTORISTAS */}
      {selectedMotorista === 'TODOS OS MOTORISTAS' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-sm ${panelBg}`}>
             <div>
                <h3 className={`text-2xl font-black mb-1 ${textValue}`}>Resumo da Frota</h3>
                <p className={`text-sm ${textTitle}`}>Total a repassar para {summaryAll.length} motoristas.</p>
             </div>
             <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="text-right">
                   <p className={`text-xs uppercase font-bold mb-1 ${textTitle}`}>Total Geral da Folha</p>
                   <p className={`text-3xl font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(totalGeralFolha)}</p>
                </div>
                <button 
                  onClick={handleDownloadAllZip}
                  disabled={isGeneratingPdf}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-md text-white disabled:opacity-50 ${
                    darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <FileArchive size={20} className={isGeneratingPdf ? 'animate-bounce' : ''} />
                  {isGeneratingPdf ? 'Gerando ZIP...' : 'Baixar PDFs (ZIP)'}
                </button>
             </div>
          </div>

          <div className={`rounded-2xl border shadow-sm overflow-hidden ${panelBg}`}>
             <div className="overflow-x-auto">
               <table className="w-full text-left whitespace-nowrap text-sm">
                  <thead className={`text-[11px] uppercase font-bold tracking-wider ${darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    <tr>
                      <th className="p-4 pl-6">Motorista</th>
                      <th className="p-4 text-center">Dias Trabalhados</th>
                      <th className="p-4 pr-6 text-right">Valor a Receber</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                    {summaryAll.map((s, idx) => (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className={`p-4 pl-6 font-bold ${textValue}`}>{s.motorista}</td>
                        <td className={`p-4 text-center ${textTitle}`}>{s.dias} dias</td>
                        <td className={`p-4 pr-6 text-right font-black ${s.total >= 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-red-400' : 'text-red-500')}`}>
                          {formatCurrency(s.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* Extrato de Motorista Específico */}
      {selectedMotorista && selectedMotorista !== 'TODOS OS MOTORISTAS' && (
        <div className="space-y-6">
          
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
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
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
                <button 
                  onClick={handleDownloadSinglePdf}
                  className={`mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md text-white ${
                    darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Download size={16} />
                  Baixar PDF do Extrato
                </button>
              </div>
            </div>
          </div>

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
                Limpar Busca
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
                    const recebivelDia = r.vlrDasDiarias + r.vlrEntregas + r.bonus + r.vlrColetas + r.vlrSabado + diaPedMudOutros - r.descontos;
                    
                    const inputClass = `w-20 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none text-right transition-all ${darkMode ? 'text-slate-200 hover:border-slate-600' : 'text-slate-700'}`;
                    
                    const InputNum = ({ field }: { field: keyof LogisticsRecord }) => (
                      <input
                        type="number"
                        value={r[field] === 0 ? '' : Number(r[field])}
                        onChange={(e) => onUpdateRecord(r.id, field, parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0"
                        step="any"
                      />
                    );

                    return (
                      <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                        <td className={`p-3 pl-4 font-medium ${textValue}`}>{formatDateBR(r.data)}</td>
                        <td className="p-3 text-center"><InputNum field="entregas" /></td>
                        <td className="p-3 text-right"><InputNum field="vlrEntregas" /></td>
                        <td className="p-3 text-right"><InputNum field="vlrDiaria" /></td>
                        <td className="p-3 text-right"><InputNum field="bonus" /></td>
                        <td className="p-3 text-right"><InputNum field="vlrColetas" /></td>
                        <td className="p-3 text-right"><InputNum field="vlrSabado" /></td>
                        <td className="p-3 text-right"><InputNum field="outrosValores" /></td>
                        <td className="p-3 text-right"><InputNum field="descontos" /></td>
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
              Pesquise por "TODOS" para ver o resumo completo ou selecione um motorista específico para ver o extrato detalhado.
              Você pode gerar relatórios em PDF de qualidade profissional para facilitar os pagamentos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
