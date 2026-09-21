import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  MapPin, 
  Phone, 
  X, 
  Sparkles,
  Loader2,
  Globe
} from 'lucide-react';
import { EventAgendaItem } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaStorageService } from '../../services/mediaStorageService';

interface AdminAgendaProps {
  onRefresh?: () => void;
}

export const AdminAgenda: React.FC<AdminAgendaProps> = ({ onRefresh }) => {
  const [items, setItems] = useState<EventAgendaItem[]>(storageService.getEventAgenda());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventAgendaItem | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [siteLink, setSiteLink] = useState('');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  const reloadData = () => {
    setItems(storageService.getEventAgenda());
    onRefresh?.();
  };

  const handleOpenForm = (item?: EventAgendaItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setBannerUrl(item.bannerUrl);
      // Format datetime
      if (item.date.includes('T')) {
        const parts = item.date.split('T');
        setDate(parts[0]);
        setTime(parts[1] || '20:00');
      } else {
        setDate(item.date);
        setTime('20:00');
      }
      setContact(item.contact);
      setLocation(item.location);
      setSiteLink(item.siteLink || '');
      setDescription(item.description || '');
      setFeatured(Boolean(item.featured));
      setActive(item.active !== false);
    } else {
      setEditingItem(null);
      setName('');
      setBannerUrl('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop');
      setDate(new Date().toISOString().slice(0, 10));
      setTime('20:00');
      setContact('(44) 99999-8888');
      setLocation('Centro de Eventos');
      setSiteLink('');
      setDescription('');
      setFeatured(false);
      setActive(true);
    }
    setIsFormOpen(true);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const url = await mediaStorageService.uploadMedia(file);
      setBannerUrl(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar banner do evento.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do evento.');
      return;
    }
    if (!bannerUrl.trim()) {
      alert('Adicione a arte / banner do evento.');
      return;
    }
    if (!contact.trim()) {
      alert('Informe o contato do evento (Telefone ou WhatsApp).');
      return;
    }

    const fullDate = date ? `${date}T${time || '00:00'}` : new Date().toISOString();

    const saved = storageService.saveEventAgendaItem({
      id: editingItem?.id,
      name: name.trim(),
      bannerUrl: bannerUrl.trim(),
      date: fullDate,
      contact: contact.trim(),
      location: location.trim() || 'A definir',
      siteLink: siteLink.trim(),
      description: description.trim(),
      featured,
      active,
    });

    setIsFormOpen(false);
    setMessage({ type: 'success', text: `Evento "${saved.name}" salvo na Agenda com sucesso!` });
    reloadData();
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDelete = (id: string) => {
    storageService.deleteEventAgendaItem(id);
    setDeleteTargetId(null);
    setMessage({ type: 'success', text: 'Evento removido da Agenda com sucesso!' });
    reloadData();
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            <span>Agenda de Eventos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre eventos com foto/banner, data, contato e botão com link direto para o site ou compra de ingressos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Evento</span>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid de Eventos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Eventos na Agenda ({items.length})
          </h3>
          <span className="text-xs text-slate-400">
            {items.filter(i => i.active).length} ativos no site público
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm">Nenhum evento cadastrado na agenda.</p>
            <button
              type="button"
              onClick={() => handleOpenForm()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
            >
              Cadastrar Primeiro Evento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-200 overflow-hidden">
                    <img 
                      src={item.bannerUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.featured && (
                      <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Destaque</span>
                      </div>
                    )}
                    {!item.active && (
                      <div className="absolute top-2.5 right-2.5 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        Inativo
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-600">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{item.date.replace('T', ' às ')}</span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 leading-snug">
                      {item.name}
                    </h4>

                    {item.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold">Contato: {item.contact}</span>
                    </div>

                    {item.siteLink && (
                      <a
                        href={item.siteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate">Visitar Site do Evento</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-end gap-2 border-t border-slate-200/60 mt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenForm(item)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-slate-100 transition-colors"
                    title="Editar Evento"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(item.id)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Excluir Evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5 border border-slate-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span>{editingItem ? 'Editar Evento da Agenda' : 'Novo Evento na Agenda'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preencha os dados do evento, foto de divulgação e links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nome do Evento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Show de Jorge & Mateus na ExpoGoio 2026"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Banner Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Banner / Foto da Arte do Evento *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    {isUploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Upload Banner</span>
                  </button>
                </div>
                {bannerUrl && (
                  <div className="mt-2 h-28 w-44 rounded-xl overflow-hidden border border-slate-200 relative">
                    <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Data do Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contato do Evento (WhatsApp / Fone) *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="(44) 99999-8888"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Local do Evento
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Parque de Exposições"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Link do Site do Evento / Compra de Ingressos
                </label>
                <input
                  type="url"
                  value={siteLink}
                  onChange={(e) => setSiteLink(e.target.value)}
                  placeholder="https://ingressos.com/evento"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-400">
                  Ao preencher, o visitante poderá clicar diretamente no botão para acessar o site oficial do evento.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Descrição do Evento (opcional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações adicionais sobre o evento..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex gap-4 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Destaque na Agenda</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Ativo no Site</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Salvar Alterações' : 'Salvar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Excluir Evento?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Este evento será removido da agenda pública do portal.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTargetId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
