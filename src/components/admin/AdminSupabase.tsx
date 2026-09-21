import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  UploadCloud, 
  DownloadCloud, 
  Zap,
  Info,
  Layers,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  testSupabaseConnection, 
  ACTIVE_SUPABASE_CONFIG 
} from '../../services/supabaseClient';
import { supabaseSyncService, SUPABASE_SCHEMA_SQL, SyncStatus } from '../../services/supabaseSyncService';
import { storageService } from '../../services/storageService';

interface AdminSupabaseProps {
  onDataChanged?: () => void;
}

export const AdminSupabase: React.FC<AdminSupabaseProps> = ({ onDataChanged }) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabaseSyncService.getSyncStatus());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Local records counts
  const articlesCount = storageService.getArticles().length;
  const categoriesCount = storageService.getCategories().length;
  const bannersCount = storageService.getBanners().length;

  useEffect(() => {
    const handleSyncUpdate = () => {
      setSyncStatus(supabaseSyncService.getSyncStatus());
      setConfig(getSupabaseConfig());
    };

    window.addEventListener('portal_supabase_sync_updated', handleSyncUpdate);
    return () => window.removeEventListener('portal_supabase_sync_updated', handleSyncUpdate);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setActionMessage(null);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        message: `Falha de rede ao conectar: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportAll = async () => {
    setIsSyncing(true);
    setActionMessage(null);
    try {
      const result = await supabaseSyncService.exportAllToSupabase();
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `Sincronização enviada com sucesso! ${result.count} coleções atualizadas no Supabase.`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: `Aviso na sincronização: ${result.message}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({
        type: 'error',
        text: `Erro ao enviar para o Supabase: ${msg}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncStatus(supabaseSyncService.getSyncStatus());
    }
  };

  const handleImportAll = async () => {
    setIsSyncing(true);
    setActionMessage(null);
    try {
      const result = await supabaseSyncService.importAllFromSupabase();
      if (result.success) {
        setActionMessage({
          type: 'success',
          text: `Dados importados com sucesso do Supabase! ${result.count} coleções atualizadas localmente.`,
        });
        if (typeof onDataChanged === 'function') onDataChanged();
      } else {
        setActionMessage({
          type: 'error',
          text: `Erro ao importar: ${result.message}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({
        type: 'error',
        text: `Erro ao buscar do Supabase: ${msg}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncStatus(supabaseSyncService.getSyncStatus());
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const hasAnonKey = Boolean(config.anonKey && config.anonKey.trim().length > 10);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Sincronização com Supabase</h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PostgreSQL em Nuvem
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Conectado ao projeto oficial <strong className="text-white">{ACTIVE_SUPABASE_CONFIG.projectName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer disabled:opacity-60"
            >
              <Zap className={`w-4 h-4 text-amber-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <button
              onClick={handleExportAll}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        </div>

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nome do Projeto</span>
            <p className="text-sm font-bold text-white mt-0.5 truncate">{ACTIVE_SUPABASE_CONFIG.projectName}</p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID do Projeto</span>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5 truncate">{ACTIVE_SUPABASE_CONFIG.projectId}</p>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">URL da API</span>
            <p className="text-xs font-mono text-slate-300 mt-0.5 truncate">{ACTIVE_SUPABASE_CONFIG.apiUrl}</p>
          </div>
        </div>
      </div>

      {/* Action / Feedback Messages */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-3 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : actionMessage.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Connection Test Result Card */}
      {testResult && (
        <div className={`p-4 rounded-2xl border ${
          testResult.success 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-xs sm:text-sm">{testResult.message}</p>
              {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tempo de resposta: <strong className="font-mono">{testResult.latencyMs}ms</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Status & Local Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sync Controls & Status (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Realtime Sync Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              Estado da Sincronização em Tempo Real
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-800">Status Geral</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{syncStatus.message}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  syncStatus.status === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : syncStatus.status === 'syncing'
                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                    : syncStatus.status === 'error'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {syncStatus.status === 'success' ? 'Sincronizado' :
                   syncStatus.status === 'syncing' ? 'Sincronizando...' :
                   syncStatus.status === 'error' ? 'Atenção' : 'Aguardando'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Última Sincronização</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {syncStatus.lastSyncTime 
                      ? new Date(syncStatus.lastSyncTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Nenhuma nesta sessão'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Auto-Sync em Segundo Plano</span>
                  <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Ativo (automático)
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleExportAll}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Subir Dados Locais para o Supabase</span>
                </button>
                <button
                  onClick={handleImportAll}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4 text-blue-600" />
                  <span>Baixar Dados do Supabase</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration & Environment Guide */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Credenciais & Variáveis de Ambiente
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              O projeto está apontado diretamente para a URL do seu Supabase:
            </p>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono text-xs text-slate-700 space-y-1">
              <div><strong className="text-slate-900">VITE_SUPABASE_URL</strong>: {config.url}</div>
              <div><strong className="text-slate-900">VITE_SUPABASE_PROJECT_ID</strong>: {ACTIVE_SUPABASE_CONFIG.projectId}</div>
              <div>
                <strong className="text-slate-900">VITE_SUPABASE_ANON_KEY</strong>:{' '}
                {hasAnonKey ? (
                  <span className="text-emerald-600 font-sans font-bold">✓ Configurada</span>
                ) : (
                  <span className="text-amber-600 font-sans font-semibold">Pendente nas Configurações (Settings)</span>
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 bg-blue-50/60 p-3 rounded-xl border border-blue-100 leading-relaxed">
              💡 Para que o Supabase autorize gravações públicas com segurança, garanta que a chave anônima (anon public key) do projeto esteja definida em seu painel de Segredos/Configurações (Settings). Você encontra essa chave no seu dashboard do Supabase em <strong>Project Settings → API → Project API Keys → anon (public)</strong>.
            </div>
          </div>
        </div>

        {/* Right Column: Local Data Snapshot & SQL Schema (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Local Content Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              Conteúdo Local Pronto para Sincronizar
            </h2>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Matérias Jornalísticas
                </span>
                <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {articlesCount}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Categorias com Ordenação
                </span>
                <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {categoriesCount}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  Banners (Slideshow & Laterais)
                </span>
                <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {bannersCount}
                </span>
              </div>
            </div>
          </div>

          {/* SQL Setup Schema Generator */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Script SQL do Banco
                </h2>
                <p className="text-[11px] text-slate-500">Tabelas e políticas RLS para o SQL Editor do Supabase</p>
              </div>

              <button
                onClick={handleCopySql}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Se você acabou de criar o projeto no Supabase, abra o <strong>SQL Editor</strong> no painel do Supabase, cole o script acima e clique em <strong>Run</strong> para criar as tabelas com um clique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
