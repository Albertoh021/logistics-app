import { useState, useEffect, useMemo } from 'react';
import type { LogisticsRecord, GlobalCosts, GoogleSheetsConfig } from './types';
import { generateId } from './utils';
import { DashboardHeader } from './components/DashboardHeader';
import { Toolbar } from './components/Toolbar';
import { SpreadsheetTable } from './components/SpreadsheetTable';
import { DashboardView } from './components/DashboardView';
import { SummaryView } from './components/SummaryView';
import { ColetaAnalysisView } from './components/ColetaAnalysisView';
import { InsightsView } from './components/InsightsView';
import { DriverPerformanceView } from './components/DriverPerformanceView';
import { ConfigView } from './components/ConfigView';
import { PreviaView } from './components/PreviaView';
import { fetchGoogleSheetsData } from './services/googleSheets';
import { Receipt, RefreshCw } from 'lucide-react';

const INITIAL_DATA: LogisticsRecord[] = [];

const INITIAL_COSTS: GlobalCosts = {
  aluguel: 0,
  combustivel: 0,
  manutencao: 0,
  seguro: 0
};

function App() {
  const [activeTab, setActiveTab] = useState<'spreadsheet' | 'dashboard' | 'summary' | 'coletas' | 'insights' | 'performance' | 'config' | 'previa'>('spreadsheet');
  const [isSyncing, setIsSyncing] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('logistics_start_date') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('logistics_end_date') || '');
  
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    const saved = localStorage.getItem('logistics_gs_config');
    if (saved) return JSON.parse(saved);
    return {
      urlContratos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrB9Vyai3BbY6qNgReC91xpD4ZETXN3s273e1bY_9ysp_78U4boSvLaQjBgtGgUKlqXJBB8bdRk2w/pub?gid=371113084&single=true&output=csv',
      urlEntregas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQsJ46qpuqVO3VvQLp9R3sLBJe7a5vLu02ae9nox4hyc4t9rnUAr74B3fqCA5dRmGyt6rDcuogbwvvU/pub?gid=0&single=true&output=csv',
      urlColetas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQp8ZBJdS-SiRZQgUpUuycrORfLC1JzzkIjz2aGLqFELs9qbg1RMLPWdFtgmvaC6UuGt1SVKPv6ysC3/pub?gid=0&single=true&output=csv',
      urlVeiculosDiario: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQybI5KTowf4OiZci5-hCkN7iX4nx0ZVS1oFxOB9H2Bxm8Um4z3tiqtn9lhvl4iByxISR3Hr4qxxTx0/pub?gid=360491932&single=true&output=csv',
      urlVeiculosPrevia: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQybI5KTowf4OiZci5-hCkN7iX4nx0ZVS1oFxOB9H2Bxm8Um4z3tiqtn9lhvl4iByxISR3Hr4qxxTx0/pub?gid=1596383573&single=true&output=csv',
      urlLancamentos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHmPtIj7ccCzVnHw_K0hrDKsCktaxGGCnqGzNY-yX1cUHuq3tndCwF31SznXJJH_xfTVpFkgHNblZp/pub?gid=0&single=true&output=csv',
    };
  });
  
  const [records, setRecords] = useState<LogisticsRecord[]>(() => {
    const saved = localStorage.getItem('logistics_records_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<Partial<Record<keyof LogisticsRecord, string[]>>>({});

  const [globalCosts, setGlobalCosts] = useState<GlobalCosts>(() => {
    const saved = localStorage.getItem('logistics_global_costs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_COSTS;
      }
    }
    return INITIAL_COSTS;
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Persist to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem('logistics_records_v2', JSON.stringify(records));
  }, [records]);

  // Persist dates
  useEffect(() => {
    localStorage.setItem('logistics_start_date', startDate);
    localStorage.setItem('logistics_end_date', endDate);
  }, [startDate, endDate]);

  // Persist google sheets config
  useEffect(() => {
    localStorage.setItem('logistics_gs_config', JSON.stringify(googleSheetsConfig));
  }, [googleSheetsConfig]);

  // Persist global costs
  useEffect(() => {
    localStorage.setItem('logistics_global_costs', JSON.stringify(globalCosts));
  }, [globalCosts]);

  const addRecord = () => {
    const newRecord: LogisticsRecord = {
      id: generateId(),
      motorista: '',
      tipoContrato: '',
      veiculo: '',
      operacao: '',
      vlrDiaria: 0,
      diasTrabalhados: 0,
      entregas: 0,
      valorFaturado: 0,
      insucessos: 0,
      vlrDasDiarias: 0,
      vlrEntregas: 0,
      bonus: 0,
      coletas: 0,
      vlrColetas: 0,
      vlrSabado: 0,
      pedagio: 0,
      mudanca: 0,
      outrosValores: 0,
      descontos: 0,
      vlrTotal: 0,
      tckMedio: 0,
      lucroBruto: 0,
      pctCusto: 0,
      entregasDia: 0,
      coletasDia: 0,
      regiaoEntrega: '',
      cep: '',
      pctColetados: 0,
      pctPorPonto: 0,
      data: '',
      custoVeiculo: 0
    };
    setRecords([newRecord, ...records]);
    setActiveTab('spreadsheet');
  };

  const updateRecord = (id: string, field: keyof LogisticsRecord, value: string | number) => {
    setRecords(records.map(r => {
      if (r.id !== id) return r;

      const updated = { ...r, [field]: value };
      
      updated.vlrDasDiarias = updated.vlrDiaria * updated.diasTrabalhados;
      
      updated.vlrTotal = updated.vlrDasDiarias + updated.vlrEntregas + updated.bonus + 
                         updated.vlrColetas + updated.vlrSabado + updated.pedagio + 
                         updated.mudanca + updated.outrosValores - updated.descontos;
      
      updated.tckMedio = updated.entregas > 0 ? (updated.vlrTotal / updated.entregas) : 0;
      updated.lucroBruto = updated.valorFaturado - updated.vlrTotal;
      updated.pctCusto = updated.valorFaturado > 0 ? (updated.vlrTotal / updated.valorFaturado) * 100 : 0;
      
      updated.entregasDia = updated.diasTrabalhados > 0 ? (updated.entregas / updated.diasTrabalhados) : 0;
      updated.coletasDia = updated.diasTrabalhados > 0 ? (updated.coletas / updated.diasTrabalhados) : 0;

      return updated;
    }));
  };

  const deleteRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const clearAllRecords = () => {
    setRecords([]);
  };

  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      const fetchedRecords = await fetchGoogleSheetsData(googleSheetsConfig);
      setRecords(fetchedRecords);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredRecords = useMemo(() => {
    let result = records;

    // Apply date range filter
    if (startDate || endDate) {
      result = result.filter(r => {
        if (!r.data) return true; // If somehow there's no date, include it or exclude it?
        
        const rDate = r.data;
        if (startDate && rDate < startDate) return false;
        if (endDate && rDate > endDate) return false;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.motorista.toLowerCase().includes(lowerQuery) || 
        r.tipoContrato.toLowerCase().includes(lowerQuery) ||
        r.veiculo.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply column filters
    result = result.filter(r => {
      for (const [key, allowedValues] of Object.entries(columnFilters)) {
        if (allowedValues && allowedValues.length > 0) {
          const val = String(r[key as keyof LogisticsRecord] || '');
          if (!allowedValues.includes(val)) {
            return false;
          }
        }
      }
      return true;
    });

    // Aggregate by motorista
    const aggregated = new Map<string, LogisticsRecord>();
    
    result.forEach(r => {
      if (aggregated.has(r.motorista)) {
        const existing = aggregated.get(r.motorista)!;
        existing.diasTrabalhados += r.diasTrabalhados;
        existing.entregas += r.entregas;
        existing.valorFaturado += r.valorFaturado;
        existing.insucessos += r.insucessos;
        existing.vlrEntregas += r.vlrEntregas;
        existing.bonus += r.bonus;
        existing.coletas += r.coletas;
        existing.vlrColetas += r.vlrColetas;
        existing.vlrSabado += r.vlrSabado;
        existing.pedagio += r.pedagio;
        existing.mudanca += r.mudanca;
        existing.outrosValores += r.outrosValores;
        existing.custoVeiculo += r.custoVeiculo;
        existing.descontos += r.descontos;
      } else {
        aggregated.set(r.motorista, { ...r });
      }
    });

    result = Array.from(aggregated.values());

    // Recalculate derived fields for aggregated records
    result = result.map(r => {
      r.vlrDasDiarias = r.vlrDiaria * r.diasTrabalhados;
      r.vlrTotal = r.vlrDasDiarias + r.vlrEntregas + r.bonus + r.vlrColetas + r.vlrSabado + r.pedagio + r.mudanca + r.outrosValores + r.custoVeiculo - r.descontos;
      r.lucroBruto = r.valorFaturado - r.vlrTotal;
      r.tckMedio = r.entregas > 0 ? r.vlrTotal / r.entregas : 0;
      r.pctCusto = r.valorFaturado > 0 ? (r.vlrTotal / r.valorFaturado) * 100 : 0;
      r.entregasDia = r.diasTrabalhados > 0 ? (r.entregas / r.diasTrabalhados) : 0;
      r.coletasDia = r.diasTrabalhados > 0 ? (r.coletas / r.diasTrabalhados) : 0;
      return r;
    });

    return result;
  }, [records, searchQuery, columnFilters, startDate, endDate]);

  // Set column filter
  const toggleColumnFilter = (field: keyof LogisticsRecord, value: string) => {
    setColumnFilters(prev => {
      const current = prev[field] || [];
      const isSelected = current.includes(value);
      
      const newValues = isSelected 
        ? current.filter(v => v !== value) 
        : [...current, value];

      if (newValues.length === 0) {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      }

      return { ...prev, [field]: newValues };
    });
  };

  const clearColumnFilter = (field: keyof LogisticsRecord) => {
    setColumnFilters(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans p-4 sm:p-8`}>
      <div className="max-w-[1600px] mx-auto">
        
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src="/r3-logo.png" alt="R3 Express" className="w-14 h-14 object-contain rounded-xl shadow-md" />
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>R3 Express Operacional</h1>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Sistema de Custos Logísticos da Frota</p>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('previa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'previa' 
                ? (darkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-md') 
                : (darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
            }`}
          >
            <Receipt size={18} />
            Prévia
          </button>
          <button 
            onClick={handleSyncGoogleSheets}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ${
              darkMode 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
            }`}
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          {startDate || endDate ? (
            <div className={`px-4 py-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-white border-slate-200 text-blue-700'} border rounded-xl shadow-sm flex items-center`}>
              <span className="mr-2 text-lg">📅</span>
              <span className="font-semibold tracking-wide" style={{ fontVariantNumeric: 'tabular-nums' }}>
                Período: {startDate ? new Date(startDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Início'} 
                {' até '} 
                {endDate ? new Date(endDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : 'Hoje'}
              </span>
            </div>
          ) : null}
        </header>

        {activeTab === 'spreadsheet' && (
          <DashboardHeader records={filteredRecords} darkMode={darkMode} />
        )}

        <Toolbar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddRow={addRecord}
          onClearAll={clearAllRecords}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {activeTab === 'spreadsheet' ? (
          <SpreadsheetTable 
            records={filteredRecords}
            allRecords={records}
            onUpdateRecord={updateRecord}
            onDeleteRecord={deleteRecord}
            columnFilters={columnFilters}
            onToggleFilter={toggleColumnFilter}
            onClearFilter={clearColumnFilter}
            darkMode={darkMode}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardView records={filteredRecords} darkMode={darkMode} globalCosts={globalCosts} setGlobalCosts={setGlobalCosts} />
        ) : activeTab === 'summary' ? (
          <SummaryView records={filteredRecords} darkMode={darkMode} dateRange={`${startDate} - ${endDate}`} />
        ) : activeTab === 'coletas' ? (
          <ColetaAnalysisView records={filteredRecords} darkMode={darkMode} dateRange={`${startDate} - ${endDate}`} />
        ) : activeTab === 'performance' ? (
          <DriverPerformanceView records={filteredRecords} darkMode={darkMode} dateRange={`${startDate} - ${endDate}`} />
        ) : activeTab === 'insights' ? (
          <InsightsView records={filteredRecords} darkMode={darkMode} dateRange={`${startDate} - ${endDate}`} />
        ) : activeTab === 'previa' ? (
          <PreviaView records={records} startDate={startDate} endDate={endDate} darkMode={darkMode} onUpdateRecord={updateRecord} />
        ) : (
          <ConfigView 
            config={googleSheetsConfig} 
            onSave={setGoogleSheetsConfig} 
            onSync={handleSyncGoogleSheets} 
            darkMode={darkMode} 
          />
        )}

      </div>
    </div>
  );
}

export default App;
