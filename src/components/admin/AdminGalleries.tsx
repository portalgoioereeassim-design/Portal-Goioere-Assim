import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Edit3, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  AlertCircle, 
  Eye, 
  Calendar, 
  MapPin, 
  User, 
  X, 
  Layers, 
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { EventGallery, GalleryConfig } from '../../types';
import { storageService } from '../../services/storageService';
import { mediaStorageService } from '../../services/mediaStorageService';

interface AdminGalleriesProps {
  onRefresh?: () => void;
}

export const AdminGalleries: React.FC<AdminGalleriesProps> = ({ onRefresh }) => {
  const [config, setConfig] = useState<GalleryConfig>(storageService.getGalleryConfig());
  const [galleries, setGalleries] = useState<EventGallery[]>(storageService.getGalleries());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<EventGallery | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showAsArticle, setShowAsArticle] = useState(true);
  const [manualPhotoUrl, setManualPhotoUrl] = useState('');

  // Config fields
  const [configTabName, setConfigTabName] = useState(config.tabName || 'Galerias de Fotos (Eventos)');
  const [configEnabled, setConfigEnabled] = useState(config.enabled !== false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const reloadData = () => {
    setConfig(storageService.getGalleryConfig());
    setGalleries(storageService.getGalleries());
    onRefresh?.();
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = storageService.saveGalleryConfig({
      tabName: configTabName.trim() || 'Galerias de Fotos (Eventos)',
      enabled: configEnabled,
    });
    setConfig(updated);
    setMessage({ type: 'success', text: 'Configurações da aba de galerias salvas com sucesso!' });
    reloadData();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleOpenForm = (gallery?: EventGallery) => {
    if (gallery) {
      setEditingGallery(gallery);
      setTitle(gallery.title);
      setSubtitle(gallery.subtitle || '');
      setEventDate(gallery.eventDate || new Date().toISOString().slice(0, 10));
      setLocation(gallery.location || '');
      setOrganizer(gallery.organizer || '');
      setCoverImage(gallery.coverImage);
      setPhotos(gallery.photos || []);
      setShowAsArticle(gallery.showAsArticle !== false);
    } else {
      setEditingGallery(null);
      setTitle('');
      setSubtitle('');
      setEventDate(new Date().toISOString().slice(0, 10));
      setLocation('');
      setOrganizer('');
      setCoverImage('https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop');
      setPhotos([]);
      setShowAsArticle(true);
    }
    setManualPhotoUrl('');
    setIsFormOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const url = await mediaStorageService.uploadMedia(file);
      setCoverImage(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar imagem de capa.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPhotos(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await mediaStorageService.uploadMedia(files[i]);
        newUrls.push(url);
      }
      setPhotos((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar fotos para a galeria.');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleAddManualPhoto = () => {
    if (manualPhotoUrl.trim()) {
      setPhotos((prev) => [...prev, manualPhotoUrl.trim()]);
      setManualPhotoUrl('');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor, informe o título da galeria.');
      return;
    }
    if (!coverImage.trim()) {
      alert('Por favor, adicione uma foto de capa para o evento.');
      return;
    }

    const saved = storageService.saveGallery({
      id: editingGallery?.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      eventDate,
      location: location.trim(),
      organizer: organizer.trim(),
      coverImage: coverImage.trim(),
      photos: photos.length > 0 ? photos : [coverImage.trim()],
      showAsArticle,
      articleId: editingGallery?.articleId,
    });

    setIsFormOpen(false);
    setMessage({ 
      type: 'success', 
      text: `Galeria "${saved.title}" salva com sucesso! ${showAsArticle ? 'Publicada também como Matéria no site.' : ''}` 
    });
    reloadData();
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDeleteGallery = (id: string) => {
    storageService.deleteGallery(id);
    setDeleteTargetId(null);
    setMessage({ type: 'success', text: 'Galeria de fotos excluída com sucesso!' });
    reloadData();
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-red-600" />
            <span>Galerias de Fotos (Eventos)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre coberturas completas de eventos com fotos. As galerias aparecem no menu e podem ser sincronizadas automaticamente como matérias no corpo do site.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Galeria de Fotos</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Configuração da Aba no Menu */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          <span>Personalizar Aba no Menu do Site</span>
        </h3>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nome da Guia no Menu Principal
            </label>
            <input
              type="text"
              value={configTabName}
              onChange={(e) => setConfigTabName(e.target.value)}
              placeholder="Ex: Galerias de Fotos (Eventos), Coberturas, Baladas..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
            />
            <p className="text-[11px] text-slate-400">
              Você pode alterar o nome da guia que aparece na barra de navegação pública do portal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 border border-slate-200 rounded-xl">
              <input
                type="checkbox"
                checked={configEnabled}
                onChange={(e) => setConfigEnabled(e.target.checked)}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700">Aba Ativa no Site</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Salvar Nome da Guia
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Galerias */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Galerias Cadastradas ({galleries.length})
          </h3>
          <span className="text-xs text-slate-400">
            {galleries.filter(g => g.showAsArticle).length} sincronizadas com o corpo do site como matéria
          </span>
        </div>

        {galleries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Camera className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm">Nenhuma galeria cadastrada ainda.</p>
            <button
              type="button"
              onClick={() => handleOpenForm()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
            >
              Criar Primeira Galeria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
            {galleries.map((gallery) => (
              <div 
                key={gallery.id} 
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-video bg-slate-200 overflow-hidden">
                    <img 
                      src={gallery.coverImage} 
                      alt={gallery.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{gallery.photos?.length || 1} fotos</span>
                    </div>

                    {gallery.showAsArticle && (
                      <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>No Corpo do Site (Matéria)</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{gallery.eventDate || 'Data não definida'}</span>
                      {gallery.location && (
                        <>
                          <span>•</span>
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{gallery.location}</span>
                        </>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                      {gallery.title}
                    </h4>

                    {gallery.subtitle && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {gallery.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-200/60 mt-2">
                  <span className="text-[11px] text-slate-400">
                    {gallery.organizer ? `Por ${gallery.organizer}` : 'Cobertura Oficial'}
                  </span>

                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenForm(gallery)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-slate-100 transition-colors"
                      title="Editar Galeria"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(gallery.id)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Excluir Galeria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição de Galeria */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 border border-slate-200 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-red-600" />
                  <span>{editingGallery ? 'Editar Galeria de Fotos' : 'Nova Galeria de Fotos'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione as informações e fotos da cobertura do evento.
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

            <form onSubmit={handleSaveGallery} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Título da Cobertura / Evento *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Noite de Shows na ExpoGoio 2026"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Subtítulo / Descrição Rápida
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Confira os melhores cliques e presenças marcantes registradas na noite..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Data do Evento
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
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
                    placeholder="Ex: Parque de Exposições"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Fotógrafo / Organização
                  </label>
                  <input
                    type="text"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="Ex: Cobertura Oficial"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Foto de Capa */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Foto de Capa Principal *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Upload Capa</span>
                  </button>
                </div>
                {coverImage && (
                  <div className="mt-2 h-28 w-44 rounded-xl overflow-hidden border border-slate-200 relative">
                    <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Upload de Múltiplas Fotos da Galeria */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Fotos da Cobertura ({photos.length} adicionadas)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Selecione múltiplos arquivos de uma vez
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    multiple
                    ref={photosInputRef}
                    onChange={handlePhotosUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => photosInputRef.current?.click()}
                    disabled={isUploadingPhotos}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {isUploadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Upload Múltiplas Fotos</span>
                  </button>

                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      value={manualPhotoUrl}
                      onChange={(e) => setManualPhotoUrl(e.target.value)}
                      placeholder="Ou cole o link de uma foto aqui..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualPhoto}
                      className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Grid de Miniaturas de Fotos */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-48 overflow-y-auto">
                    {photos.map((photoUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 bg-white">
                        <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sincronizar com o Corpo do Site como Matéria */}
              <div className="p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAsArticle}
                    onChange={(e) => setShowAsArticle(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Aparecer no corpo do site como Matéria
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 pl-6.5">
                  Ao ativar, esta galeria será publicada automaticamente como uma matéria completa com carrossel de fotos na página inicial e na categoria Eventos.
                </p>
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
                  <span>{editingGallery ? 'Salvar Alterações' : 'Salvar e Publicar Galeria'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Excluir Galeria?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Esta ação removerá a galeria de fotos do portal. Deseja continuar?
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
                onClick={() => handleDeleteGallery(deleteTargetId)}
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
