import React, { useState, useEffect } from 'react';
import { 
  Key, 
  User, 
  Shield, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Save, 
  Lock, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Users, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { storageService } from '../../services/storageService';
import { AdminUser } from '../../types';

export const AdminCredentialsManager: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New user form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'redator'>('admin');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    loadUsers();
    const handleUpdate = () => loadUsers();
    window.addEventListener('portal_admin_users_updated', handleUpdate);
    return () => window.removeEventListener('portal_admin_users_updated', handleUpdate);
  }, []);

  const loadUsers = () => {
    const list = storageService.getAdminUsers();
    setUsers(list);
  };

  const handleTogglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleUpdateUserField = (id: string, field: keyof AdminUser, value: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, [field]: value };
      }
      return u;
    }));
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (users.length <= 1) {
      setMessage({ type: 'error', text: 'Não é permitido excluir o único usuário de acesso ao sistema. Mantenha ao menos um usuário ativo.' });
      return;
    }

    if (!confirm(`Deseja realmente remover o usuário "${username}"? Ele não poderá mais fazer login no painel.`)) {
      return;
    }

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    storageService.saveAdminUsers(updated);
    setMessage({ type: 'success', text: `Usuário "${username}" removido com sucesso.` });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();

    let cleanUsername = newUsername.trim();
    if (!cleanUsername) {
      setMessage({ type: 'error', text: 'Informe um nome de usuário (login) válido (ex: @Daniel1995 ou redacao).' });
      return;
    }

    // Format with leading '@' if not provided
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = `@${cleanUsername}`;
    }

    // Check duplicate login
    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      setMessage({ type: 'error', text: `Já existe um usuário cadastrado com o login "${cleanUsername}". Escolha outro nome de login.` });
      return;
    }

    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 3) {
      setMessage({ type: 'error', text: 'A senha de acesso deve ter pelo menos 3 caracteres.' });
      return;
    }

    const roleName = newRole === 'admin' 
      ? 'Administrador Geral' 
      : newRole === 'editor' 
      ? 'Editor de Notícias' 
      : 'Redator';

    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      name: newName.trim() || cleanUsername,
      password: cleanPass,
      role: roleName,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    storageService.saveAdminUsers(updated);

    // Reset form
    setNewUsername('');
    setNewName('');
    setNewPassword('');
    setNewRole('admin');
    setIsAddingUser(false);

    setMessage({
      type: 'success',
      text: `Novo usuário ${newUser.username} (${newUser.name}) cadastrado com sucesso! Ele já pode fazer login no painel.`,
    });
    setTimeout(() => setMessage(null), 6000);
  };

  const handleSaveAllUsers = () => {
    setMessage(null);

    // Validation
    for (const u of users) {
      if (!u.username.trim()) {
        setMessage({ type: 'error', text: 'Todos os usuários devem ter um Login/Usuário preenchido.' });
        return;
      }
      if (!u.password.trim()) {
        setMessage({ type: 'error', text: `Defina uma senha válida para o usuário ${u.username}.` });
        return;
      }
    }

    setIsSaving(true);
    const success = storageService.saveAdminUsers(users);
    setIsSaving(false);

    if (success) {
      setMessage({
        type: 'success',
        text: 'Todas as alterações de senhas e logins foram salvas e sincronizadas com sucesso!',
      });
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({ type: 'error', text: 'Erro ao salvar credenciais. Tente novamente.' });
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(term) ||
      (u.name || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-md">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">Usuários & Senhas do Painel</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ativo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-xl">
              Gerencie e adicione novos usuários com login e senha para acessar a área administrativa e publicar conteúdos no portal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>{users.length} {users.length === 1 ? 'Usuário Cadastrado' : 'Usuários Cadastrados'}</span>
          </div>

          <button
            onClick={() => setIsAddingUser(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Adicionar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold text-blue-950">Como funciona o acesso de múltiplos usuários:</p>
          <p className="mt-0.5">
            Ao cadastrar um novo usuário informando o <strong>Login</strong> (ex: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">@Daniel1995</code> ou <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px]">@redator</code>) e uma <strong>Senha</strong>, essa pessoa poderá fazer login imediatamente na tela de login administrativo. Todas as alterações são salvas e sincronizadas automaticamente no banco de dados.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 shadow-xs transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span className="font-semibold leading-relaxed">{message.text}</span>
        </div>
      )}

      {/* Add New User Card / Form */}
      {isAddingUser && (
        <div className="bg-white rounded-2xl border-2 border-red-500 shadow-xl p-6 sm:p-7 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-slate-500">Defina o login de acesso, nome e senha para o novo membro da equipe</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Login / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Login / Usuário <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="@NovoUsuario"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Ex: @Daniel1995, @editor, @marcos</span>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Nome ou identificação interna</span>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Senha de Acesso <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 3 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white text-slate-900"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    title={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Ex: 1010 ou senha forte</span>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nível / Função
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'editor' | 'redator')}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-red-600 focus:bg-white text-slate-900"
                >
                  <option value="admin">Administrador Geral</option>
                  <option value="editor">Editor de Notícias</option>
                  <option value="redator">Redator / Colunista</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Permissões no painel</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar e Salvar Usuário</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Search and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Lista de Usuários com Acesso ({filteredUsers.length})</span>
        </div>

        {users.length > 2 && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por login ou nome..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Users List Cards */}
      <div className="space-y-4">
        {filteredUsers.map((u, idx) => {
          const isShowPass = Boolean(showPasswords[u.id]);
          const isDefaultUser = u.username === '@Daniel1995';

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4 transition-all hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    {(u.name || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{u.name || u.username}</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                        {u.username}
                      </span>
                      {isDefaultUser && (
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-red-600" />
                          Usuário Principal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Função: <strong>{u.role || 'Administrador'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {users.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="px-3 py-1.5 text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Fields for existing user */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Login / Usuário
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={u.username}
                      onChange={(e) => handleUpdateUserField(u.id, 'username', e.target.value)}
                      placeholder="@usuario"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nome de Identificação
                  </label>
                  <input
                    type="text"
                    value={u.name || ''}
                    onChange={(e) => handleUpdateUserField(u.id, 'name', e.target.value)}
                    placeholder="Nome completo ou cargo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={isShowPass ? 'text' : 'password'}
                      value={u.password}
                      onChange={(e) => handleUpdateUserField(u.id, 'password', e.target.value)}
                      placeholder="Senha do usuário"
                      className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => handleTogglePasswordVisibility(u.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                      title={isShowPass ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {isShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
            <p className="text-sm text-slate-500">Nenhum usuário encontrado para a busca "{searchFilter}".</p>
          </div>
        )}
      </div>

      {/* Save Button Bar */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-md">
        <div className="text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Alterou o login ou senha de algum usuário acima?</p>
          <p className="text-[11px] text-slate-400">Clique no botão para salvar as alterações e sincronizar com o banco de dados.</p>
        </div>

        <button
          type="button"
          onClick={handleSaveAllUsers}
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Alterações de Senhas e Logins</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
