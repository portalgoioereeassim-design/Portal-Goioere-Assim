import React, { useState } from 'react';
import { Lock, User, Key, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { storageService } from '../../services/storageService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const validation = storageService.validateAdminUser(username, password);
      if (validation.success && validation.user) {
        localStorage.setItem('portal_admin_session', JSON.stringify({
          logged: true,
          userId: validation.user.id,
          username: validation.user.username,
          name: validation.user.name,
          role: validation.user.role,
          time: new Date().toISOString()
        }));
        onLoginSuccess();
      } else {
        setError('Usuário ou senha incorretos. Verifique as credenciais digitadas.');
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onCancel}
            className="absolute top-5 left-5 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Voltar ao portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Painel Administrativo</h2>
            <p className="text-xs text-slate-400 mt-1">Acesso restrito para editores e gestão do portal</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Usuário de Acesso
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white text-slate-900"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white text-slate-900"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-700 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Entrar no Painel</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancelar e voltar ao site público
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
