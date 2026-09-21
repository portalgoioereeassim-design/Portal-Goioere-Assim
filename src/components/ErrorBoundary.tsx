import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleClearAndRestore = () => {
    try {
      // Clear potentially corrupt keys while keeping essential credentials if needed
      const keysToClear = [
        'portal_news_articles_v1',
        'portal_news_categories_v1',
        'portal_news_banners_v1',
        'portal_deleted_article_ids',
        'portal_deleted_category_ids',
        'portal_deleted_banner_ids',
      ];
      for (const k of keysToClear) {
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Portal em Recuperação
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Detectamos uma instabilidade temporária ao carregar a página. Você pode recarregar ou restaurar a visualização padrão.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Ir para o Início</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={this.handleClearAndRestore}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Restaurar dados padrões e limpar cache</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200">
                <summary className="font-semibold cursor-pointer text-slate-700 select-none">
                  Detalhes do erro
                </summary>
                <p className="mt-2 font-mono text-[11px] text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
