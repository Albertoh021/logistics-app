import { useState } from 'react';
import { RefreshCw, Save, Database, Link as LinkIcon, AlertCircle } from 'lucide-react';
import type { GoogleSheetsConfig } from '../types';

interface ConfigViewProps {
  config: GoogleSheetsConfig;
  onSave: (config: GoogleSheetsConfig) => void;
  onSync: () => Promise<void>;
  darkMode: boolean;
}

export const ConfigView = ({ config, onSave, onSync, darkMode }: ConfigViewProps) => {
  const [localConfig, setLocalConfig] = useState<GoogleSheetsConfig>(config);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleChange = (key: keyof GoogleSheetsConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
    setSyncStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
    setTimeout(() => setSyncStatus({ type: null, message: '' }), 3000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });
    try {
      await onSync();
      setSyncStatus({ type: 'success', message: 'Dados sincronizados com sucesso!' });
    } catch (error) {
      setSyncStatus({ type: 'error', message: 'Erro ao sincronizar dados. Verifique as URLs.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const panelBg = darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-100';
  const inputBg = darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20';

  return (
    <div className={`space-y-6 animate-in fade-in duration-700 pb-12 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'} shadow-sm`}>
           <Database size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">Banco de Dados</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Integração com Google Sheets em tempo real.</p>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${panelBg} shadow-sm max-w-4xl`}>
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon size={14} className="opacity-50" /> URL Contratos
              </label>
              <input
                type="text"
                value={localConfig.urlContratos}
                onChange={e => handleChange('urlContratos', e.target.value)}
                placeholder="Cole o link CSV publicado do Google Sheets..."
                className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 ${inputBg}`}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon size={14} className="opacity-50" /> URL Entregas
              </label>
              <input
                type="text"
                value={localConfig.urlEntregas}
                onChange={e => handleChange('urlEntregas', e.target.value)}
                placeholder="Cole o link CSV publicado do Google Sheets..."
                className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 ${inputBg}`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon size={14} className="opacity-50" /> URL Coletas
              </label>
              <input
                type="text"
                value={localConfig.urlColetas}
                onChange={e => handleChange('urlColetas', e.target.value)}
                placeholder="Cole o link CSV publicado do Google Sheets..."
                className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 ${inputBg}`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold flex items-center gap-2">
                  <LinkIcon size={14} className="opacity-50" /> URL Custos Diários (Veículos)
                </label>
                <input
                  type="text"
                  value={localConfig.urlVeiculosDiario}
                  onChange={e => handleChange('urlVeiculosDiario', e.target.value)}
                  placeholder="Cole o link CSV publicado..."
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 ${inputBg}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold flex items-center gap-2">
                  <LinkIcon size={14} className="opacity-50" /> URL Custos Prévios (Veículos)
                </label>
                <input
                  type="text"
                  value={localConfig.urlVeiculosPrevia}
                  onChange={e => handleChange('urlVeiculosPrevia', e.target.value)}
                  placeholder="Cole o link CSV publicado..."
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 ${inputBg}`}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <label className="text-sm font-bold flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                <LinkIcon size={14} className="opacity-50" /> URL Lançamentos Diversos
              </label>
              <input
                type="text"
                value={localConfig.urlLancamentos}
                onChange={e => handleChange('urlLancamentos', e.target.value)}
                placeholder="Cole o link CSV publicado de lançamentos diversos..."
                className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${inputBg}`}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t mt-6 gap-4">
            <div className="flex-1">
              {syncStatus.type === 'success' && (
                <span className="text-emerald-500 font-bold flex items-center gap-2 text-sm">
                   <AlertCircle size={16} /> {syncStatus.message}
                </span>
              )}
              {syncStatus.type === 'error' && (
                <span className="text-rose-500 font-bold flex items-center gap-2 text-sm">
                   <AlertCircle size={16} /> {syncStatus.message}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSave}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
              >
                <Save size={18} /> Salvar
              </button>
              
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
