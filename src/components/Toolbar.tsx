import { Search, Plus, Trash2, Sun, Moon } from 'lucide-react';


interface ToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddRow: () => void;
  onClearAll: () => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  activeTab: 'spreadsheet' | 'dashboard' | 'summary' | 'coletas' | 'insights' | 'performance' | 'config' | 'previa';
  setActiveTab: (tab: 'spreadsheet' | 'dashboard' | 'summary' | 'coletas' | 'insights' | 'performance' | 'config' | 'previa') => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export const Toolbar = ({ 
  searchQuery, 
  setSearchQuery, 
  onAddRow, 
  onClearAll,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode
}: ToolbarProps) => {


  return (
    <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
      
      {/* Search and Tabs Group */}
      <div className="flex flex-col xl:flex-row gap-4 w-full 2xl:w-auto">
        
        {/* Navigation Tabs */}
        <div className={`flex flex-wrap items-center ${darkMode ? 'bg-slate-800' : 'bg-slate-200/50'} p-1 rounded-xl w-full xl:w-auto transition-colors`}>
          <button
            onClick={() => setActiveTab('spreadsheet')}
            className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'spreadsheet' ? (darkMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            Planilha
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? (darkMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            Power BI
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'summary' ? (darkMode ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            Resumo
          </button>
          <button
            onClick={() => setActiveTab('coletas')}
            className={`flex-1 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'coletas' ? (darkMode ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-amber-600 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
          >
            Coletas
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'performance' ? (darkMode ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-600 shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')} flex items-center justify-center gap-2`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'insights' ? (darkMode ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-fuchsia-600 text-white shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')} flex items-center justify-center gap-2`}
          >
            Insights <span className="text-[10px] bg-white text-fuchsia-600 px-1.5 py-0.5 rounded-full font-black animate-pulse">IA</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'config' ? (darkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-slate-600 text-white shadow-sm') : (darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')} flex items-center justify-center`}
          >
            Configurações
          </button>
        </div>

        {/* Search Input (Only show if Spreadsheet tab) */}
        {activeTab === 'spreadsheet' && (
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <input
              type="text"
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl leading-5 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all ${darkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="Buscar por nome corporativo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Action Buttons Group */}
      <div className="flex shrink-0 gap-3 w-full sm:w-auto flex-wrap">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`flex-1 sm:flex-none flex items-center justify-center p-2.5 border rounded-xl transition-colors text-sm font-medium ${darkMode ? 'bg-slate-800 border-slate-700 text-yellow-500 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Date Filters */}
        <div className="flex items-center gap-2 mr-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
          />
          <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'}`}
          />
        </div>

        {activeTab === 'spreadsheet' && (
          <button
            onClick={onAddRow}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium shadow-sm text-white ${darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <Plus size={18} />
            Nova Linha
          </button>
        )}
        
        {activeTab === 'spreadsheet' && (
          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja apagar TODOS os registros?')) {
                onClearAll();
              }
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 border rounded-xl transition-colors text-sm font-medium shadow-sm ${darkMode ? 'bg-red-900/40 border-red-800 text-red-400 hover:bg-red-900/60' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'}`}
            title="Excluir Tudo"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Limpar Tudo</span>
          </button>
        )}
      </div>

    </div>
  );
};
