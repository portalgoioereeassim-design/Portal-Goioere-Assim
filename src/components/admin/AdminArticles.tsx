import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  Facebook, 
  Play, 
  Image as ImageIcon, 
  Upload, 
  Check, 
  AlertCircle, 
  List, 
  Quote, 
  Link as LinkIcon, 
  Calendar, 
  User,
  X,
  Share2,
  Cloud,
  Loader2,
  Bold,
  Type
} from 'lucide-react';
import { Article, Category } from '../../types';
import { storageService, extractYoutubeId } from '../../services/storageService';
import { facebookService } from '../../services/facebookService';
import { mediaStorageService } from '../../services/mediaStorageService';
import { formatArticleContent } from '../../utils/contentFormatter';
import { ArticlePreviewModal } from './ArticlePreviewModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminArticlesProps {
  articles: Article[];
  categories: Category[];
  editingArticle?: Article | null;
  onClearEditing: () => void;
  onRefresh?: () => void;
}

export const AdminArticles: React.FC<AdminArticlesProps> = ({
  articles,
  categories,
  editingArticle,
  onClearEditing,
  onRefresh,
}) => {
  const [localArticles, setLocalArticles] = useState<Article[]>(articles);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [isFormOpen, setIsFormOpen] = useState(Boolean(editingArticle));
  const [previewArticle, setPreviewArticle] = useState<Partial<Article> | null>(null);

  React.useEffect(() => {
    setLocalArticles(articles);
  }, [articles]);

  // Form State
  const [id, setId] = useState<string | undefined>(editingArticle?.id);
  const [title, setTitle] = useState(editingArticle?.title || '');
  const [subtitle, setSubtitle] = useState(editingArticle?.subtitle || '');
  const [categoryId, setCategoryId] = useState(editingArticle?.categoryId || (categories[0]?.id || ''));
  const [content, setContent] = useState(editingArticle?.content || '');
  const [featuredImage, setFeaturedImage] = useState(editingArticle?.featuredImage || '');
  const [imageCaption, setImageCaption] = useState(editingArticle?.imageCaption || '');
  const [additionalImages, setAdditionalImages] = useState<string[]>(editingArticle?.additionalImages || []);
  const [newAddImageUrl, setNewAddImageUrl] = useState('');
  const [author, setAuthor] = useState(editingArticle?.author || 'Redação');
  const [authorRole, setAuthorRole] = useState(editingArticle?.authorRole || 'Redator');
  const [publishedAt, setPublishedAt] = useState(editingArticle?.publishedAt || new Date().toISOString().slice(0, 16));
  const [youtubeUrl, setYoutubeUrl] = useState(editingArticle?.youtubeUrl || '');
  const [status, setStatus] = useState<'published' | 'draft'>(editingArticle?.status || 'published');
  const [facebookAutoPublish, setFacebookAutoPublish] = useState(editingArticle?.facebookAutoPublish ?? false);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'times' | 'mono'>(editingArticle?.fontFamily || 'sans');
  const [contentTab, setContentTab] = useState<'edit' | 'preview'>('edit');

  // Feedback states
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPublishingFb, setIsPublishingFb] = useState(false);
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<{ id: string; title: string } | null>(null);

  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Effect to sync when editingArticle prop changes
  React.useEffect(() => {
    if (editingArticle) {
      setId(editingArticle.id);
      setTitle(editingArticle.title);
      setSubtitle(editingArticle.subtitle);
      setCategoryId(editingArticle.categoryId);
      setContent(editingArticle.content);
      setFeaturedImage(editingArticle.featuredImage);
      setImageCaption(editingArticle.imageCaption || '');
      setAdditionalImages(editingArticle.additionalImages || []);
      setAuthor(editingArticle.author);
      setAuthorRole(editingArticle.authorRole || 'Redator');
      setPublishedAt(editingArticle.publishedAt ? new Date(editingArticle.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
      setYoutubeUrl(editingArticle.youtubeUrl || '');
      setStatus(editingArticle.status);
      setFacebookAutoPublish(editingArticle.facebookAutoPublish);
      setFontFamily(editingArticle.fontFamily || 'sans');
      setContentTab('edit');
      setIsFormOpen(true);
    }
  }, [editingArticle]);

  const resetForm = () => {
    setId(undefined);
    setTitle('');
    setSubtitle('');
    setCategoryId(categories[0]?.id || '');
    setContent('');
    setFeaturedImage('');
    setImageCaption('');
    setAdditionalImages([]);
    setAuthor('Redação');
    setAuthorRole('Redator');
    setPublishedAt(new Date().toISOString().slice(0, 16));
    setYoutubeUrl('');
    setFontFamily('sans');
    setContentTab('edit');
    setStatus('published');
    setFacebookAutoPublish(false);
    onClearEditing();
    setIsFormOpen(false);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Image Upload handler with Persistent Storage support
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFeatured(true);
    try {
      const result = await mediaStorageService.processAndUploadImage(file, 'materias');
      setFeaturedImage(result.url);
      setMessage({
        type: 'success',
        text: 'Imagem enviada e anexada com sucesso à matéria.',
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setMessage({
        type: 'error',
        text: 'Não foi possível processar a imagem enviada. Tente novamente.',
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setIsUploadingFeatured(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Gallery multi-image upload (up to 10 photos)
  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - additionalImages.length;
    if (remainingSlots <= 0) {
      setMessage({
        type: 'error',
        text: 'Limite máximo de 10 fotos adicionais por matéria já foi atingido.',
      });
      setTimeout(() => setMessage(null), 4000);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
      return;
    }

    const filesToUpload: File[] = Array.from(files).slice(0, remainingSlots) as File[];
    setIsUploadingGallery(true);
    try {
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        const res = await mediaStorageService.processAndUploadImage(file, 'galeria');
        if (res.url) newUrls.push(res.url);
      }
      setAdditionalImages(prev => [...prev, ...newUrls].slice(0, 10));
      setMessage({
        type: 'success',
        text: `${newUrls.length} foto(s) anexada(s) à matéria com sucesso! (${additionalImages.length + newUrls.length}/10 fotos)`,
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Gallery upload error:', err);
    } finally {
      setIsUploadingGallery(false);
      if (galleryFileInputRef.current) {
        galleryFileInputRef.current.value = '';
      }
    }
  };

  // Text formatting insertion helpers
  const handleAddAdditionalImage = () => {
    if (additionalImages.length >= 10) {
      setMessage({
        type: 'error',
        text: 'Limite máximo de 10 fotos adicionais por matéria já foi atingido.',
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    if (newAddImageUrl.trim()) {
      setAdditionalImages([...additionalImages, newAddImageUrl.trim()].slice(0, 10));
      setNewAddImageUrl('');
    }
  };

  const handleRemoveAdditionalImage = (idx: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== idx));
  };

  const isPodcast = categoryId === 'cat-podcast' || 
    categories.find(c => c.id === categoryId)?.slug === 'podcast' ||
    categories.find(c => c.id === categoryId)?.name.toLowerCase().includes('podcast');

  // Save Article
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setMessage({ type: 'error', text: 'O título da matéria/episódio é obrigatório.' });
      return;
    }

    if (!categoryId) {
      setMessage({ type: 'error', text: 'Selecione uma categoria para a matéria.' });
      return;
    }

    // If Podcast, extract thumbnail from YouTube if featuredImage is empty
    const ytId = extractYoutubeId(youtubeUrl);
    let resolvedImage = featuredImage.trim();
    if (!resolvedImage && ytId) {
      resolvedImage = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    if (!resolvedImage) {
      resolvedImage = isPodcast 
        ? 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop';
    }

    const saved = storageService.saveArticle({
      id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      categoryId,
      content: content.trim() || (subtitle.trim() ? `<p>${subtitle.trim()}</p>` : `<p>${title.trim()}</p>`),
      featuredImage: resolvedImage,
      imageCaption: imageCaption.trim(),
      additionalImages,
      author: author.trim() || 'Redação',
      authorRole: authorRole.trim() || (isPodcast ? 'Apresentador' : 'Redator'),
      publishedAt: new Date(publishedAt).toISOString(),
      youtubeUrl: youtubeUrl.trim(),
      status,
      facebookAutoPublish,
      fontFamily,
    });

    setMessage({ type: 'success', text: 'Matéria salva com sucesso no portal!' });

    // Handle Facebook Auto-Publish if enabled and published
    if (facebookAutoPublish && status === 'published' && !saved.facebookPublished) {
      setIsPublishingFb(true);
      const fbResult = await facebookService.publishArticleToFacebook(saved, true);
      setIsPublishingFb(false);
      if (fbResult.success) {
        setMessage({ type: 'success', text: 'Matéria salva e publicada automaticamente no Facebook com sucesso!' });
      } else {
        setMessage({ type: 'error', text: `Matéria salva no portal, mas a publicação no Facebook retornou: ${fbResult.message}` });
      }
    }

    onRefresh?.();
    setTimeout(() => {
      resetForm();
    }, 1200);
  };

  // Text formatting helpers for article editor
  const handleToggleBold = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    if (selected.length > 0) {
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        const unwrapped = selected.slice(2, -2);
        const newText = content.substring(0, start) + unwrapped + content.substring(end);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + unwrapped.length);
        }, 50);
        return;
      }
      const wrapped = `**${selected}**`;
      const newText = content.substring(0, start) + wrapped + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + wrapped.length);
      }, 50);
    } else {
      const placeholder = '**Texto em negrito**';
      const newText = content.substring(0, start) + placeholder + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + placeholder.length - 2);
      }, 50);
    }
  };

  const handleToggleUppercase = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    if (selected.length > 0) {
      const isAllUpper = selected === selected.toUpperCase() && selected !== selected.toLowerCase();
      const transformed = isAllUpper ? selected.toLowerCase() : selected.toUpperCase();
      const newText = content.substring(0, start) + transformed + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + transformed.length);
      }, 50);
    } else {
      const placeholder = 'TEXTO EM MAIÚSCULAS';
      const newText = content.substring(0, start) + placeholder + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + placeholder.length);
      }, 50);
    }
  };

  const handleWrapFont = (fontType: 'serif' | 'times' | 'sans' | 'mono') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const openTag = `[${fontType}]`;
    const closeTag = `[/${fontType}]`;

    if (selected.length > 0) {
      const wrapped = `${openTag}${selected}${closeTag}`;
      const newText = content.substring(0, start) + wrapped + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + wrapped.length);
      }, 50);
    } else {
      const label = fontType === 'serif' ? 'Texto em serifa' : fontType === 'times' ? 'Texto em Times' : fontType === 'mono' ? 'Texto monoespaçado' : 'Texto sem serifa';
      const placeholder = `${openTag}${label}${closeTag}`;
      const newText = content.substring(0, start) + placeholder + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + openTag.length, start + openTag.length + label.length);
      }, 50);
    }
  };

  const handleInsertExtraSpace = () => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const spacing = '\n\n\n';
    const newText = content.substring(0, start) + spacing + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + spacing.length, start + spacing.length);
    }, 50);
  };

  // Manual Facebook Publish
  const handlePublishNowToFacebook = async (articleToPublish: Article) => {
    setIsPublishingFb(true);
    const result = await facebookService.publishArticleToFacebook(articleToPublish, false);
    setIsPublishingFb(false);

    if (result.success) {
      alert(`Sucesso! ${result.message}`);
    } else {
      alert(`Aviso: ${result.message}`);
    }
    onRefresh?.();
  };

  // Delete Article - opens interactive confirmation modal (no blocked window.confirm)
  const handleDelete = (idToDelete: string, titleToDelete: string) => {
    setArticleToDelete({ id: idToDelete, title: titleToDelete });
  };

  const executeConfirmDelete = () => {
    if (!articleToDelete) return;
    const deletedTitle = articleToDelete.title;
    const deletedId = articleToDelete.id;
    
    // 1. Immediately remove from local state so UI updates without blinking or duplication
    setLocalArticles(prev => prev.filter(a => a.id !== deletedId));

    // 2. Delete permanently from storage
    storageService.deleteArticle(deletedId);

    // 3. Notify parent
    onRefresh?.();

    setMessage({
      type: 'success',
      text: `Matéria "${deletedTitle}" excluída com sucesso do portal.`,
    });

    if (id === deletedId) {
      resetForm();
    }
    setArticleToDelete(null);
    setTimeout(() => setMessage(null), 4000);
  };

  // Open Preview Modal
  const handleOpenPreview = () => {
    const selectedCat = categories.find(c => c.id === categoryId);
    setPreviewArticle({
      title,
      subtitle,
      categoryId,
      categoryName: selectedCat ? selectedCat.name : 'Geral',
      content,
      featuredImage: featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop',
      imageCaption,
      additionalImages,
      author,
      authorRole,
      publishedAt: new Date(publishedAt).toISOString(),
      youtubeUrl,
      status,
    });
  };

  // Filter list
  const filteredArticles = localArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          article.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || article.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const previewYoutubeId = extractYoutubeId(youtubeUrl);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Gerenciamento de Matérias
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre, edite, organize categorias e publique conteúdos no portal e no Facebook.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Matéria</span>
        </button>
      </div>

      {/* Form Modal / Drawer */}
      {isFormOpen && (
        <div className="bg-white rounded-2xl border-2 border-red-500/30 p-6 sm:p-8 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">
              {id ? 'Editar Matéria' : 'Cadastrar Nova Matéria'}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-xs font-semibold mb-6 flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Podcast Mode Notice Banner */}
            {isPodcast && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
                <Play className="w-5 h-5 text-purple-600 fill-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <span className="font-bold block text-sm mb-0.5">Modo Galeria de Podcast / Vídeo</span>
                  Cadastre o <strong>Título do episódio</strong> e insira o <strong>link direto do YouTube</strong> abaixo. O episódio será listado automaticamente na galeria de Podcasts e poderá ser reproduzido diretamente no site pelos visitantes.
                </div>
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isPodcast ? 'Título do Episódio do Podcast *' : 'Título da Matéria *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isPodcast ? "Ex: Episódio #12 - O Futuro da Tecnologia e IA no Brasil" : "Ex: Congresso aprova novo marco das energias renováveis"}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isPodcast ? 'Descrição / Sinopse do Episódio' : 'Subtítulo / Resumo da Notícia'}
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={isPodcast ? "Breve resumo dos temas abordados e convidados deste episódio..." : "Breve resumo da matéria que aparecerá nos cards da Home e na publicação do Facebook."}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            {/* Category, Status & Author Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoria *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status de Publicação
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                >
                  <option value="published">Publicado no Site</option>
                  <option value="draft">Rascunho (Oculto)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Autor da Notícia
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Nome do repórter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data e Hora de Publicação
                </label>
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            {/* Featured Image Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Imagem de Destaque
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                  Armazenamento Local
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      placeholder="Cole o link da imagem (HTTPS) ou faça upload..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={isUploadingFeatured}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                    >
                      {isUploadingFeatured ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  <input
                    type="text"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Legenda da foto / Crédito (Ex: Foto: Agência Brasil)"
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 italic"
                  />
                </div>

                {featuredImage && (
                  <div className="relative aspect-16/9 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 max-h-36">
                    <img
                      src={featuredImage}
                      alt="Prévia de destaque"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* YouTube Video Section */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isPodcast ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-100' : 'bg-slate-50 border-slate-200'
            }`}>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Play className={`w-4 h-4 fill-current ${isPodcast ? 'text-purple-600' : 'text-red-600'}`} />
                <span>
                  {isPodcast ? 'Link Direto do Vídeo no YouTube (Player da Galeria de Podcasts) *' : 'Vídeo do YouTube (Opcional)'}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Ex: https://www.youtube.com/watch?v=ScMzIvxBSi4 ou https://youtu.be/..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {isPodcast
                      ? 'Cole o link do vídeo do YouTube. Os usuários poderão assistir o episódio completo diretamente na Galeria de Podcasts!'
                      : 'O ID do vídeo será extraído automaticamente e o reprodutor oficial incorporado será exibido na matéria.'}
                  </p>
                </div>

                {previewYoutubeId && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-300 bg-black max-h-36">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${previewYoutubeId}`}
                      title="Prévia do YouTube"
                      className="w-full h-full border-0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Simple Text Editor for Content (No HTML) */}
            <div className="space-y-3">
              {/* Header with Title & Live Preview Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Texto Completo da Matéria *</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✍️ Digitação com Espaçamento e Formatação
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Todas as quebras de linha e espaços que você digitar serão mantidos exatamente assim na matéria final.
                  </p>
                </div>

                {/* Edit / Preview Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setContentTab('edit')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      contentTab === 'edit'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentTab('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      contentTab === 'preview'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pré-visualização Final</span>
                  </button>
                </div>
              </div>

              {/* Complete Formatting Toolbar: Negrito, Caixa Alta, Alterar Fonte, Espaçamento */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700">
                {/* 1. Negrito */}
                <button
                  type="button"
                  onClick={handleToggleBold}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Deixar texto em negrito (**texto**) - Atalho: Ctrl+B"
                >
                  <Bold className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
                  <span>Negrito</span>
                </button>

                {/* 2. Caixa Alta */}
                <button
                  type="button"
                  onClick={handleToggleUppercase}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Converter texto selecionado para CAIXA ALTA (Maiúsculas)"
                >
                  <span className="font-extrabold text-xs tracking-wider text-red-600">AA</span>
                  <span>Caixa Alta</span>
                </button>

                {/* Divisor vertical */}
                <div className="h-5 w-px bg-slate-300 mx-0.5" />

                {/* 3. Seletor de Fonte da Matéria */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Fonte da Matéria:</span>
                  <div className="relative">
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:ring-1 focus:ring-red-500 shadow-2xs"
                      title="Escolha o estilo tipográfico para a matéria"
                    >
                      <option value="sans">Moderna Sem Serifa (Digital)</option>
                      <option value="serif">Serifada Jornalística (Folha/Estadão)</option>
                      <option value="times">Clássica Impressa (Times)</option>
                      <option value="mono">Máquina de Escrever (Mono)</option>
                    </select>
                  </div>
                </div>

                {/* Fonte no Trecho (inline tag) */}
                <div className="hidden lg:flex items-center gap-1 bg-white/70 px-1.5 py-0.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium">Trecho:</span>
                  <button
                    type="button"
                    onClick={() => handleWrapFont('serif')}
                    className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-[11px] font-serif text-slate-700"
                    title="Aplicar fonte com serifa apenas no trecho selecionado"
                  >
                    Serifa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWrapFont('times')}
                    className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-[11px] font-times text-slate-700"
                    title="Aplicar Times apenas no trecho selecionado"
                  >
                    Times
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWrapFont('mono')}
                    className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-[11px] font-mono text-slate-700"
                    title="Aplicar fonte monoespaçada apenas no trecho selecionado"
                  >
                    Mono
                  </button>
                </div>

                {/* Divisor vertical */}
                <div className="h-5 w-px bg-slate-300 mx-0.5" />

                {/* 4. Espaço Extra entre seções */}
                <button
                  type="button"
                  onClick={handleInsertExtraSpace}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Inserir espaço vertical extra entre parágrafos ou seções"
                >
                  <span className="text-slate-500">↕</span>
                  <span>Espaço Extra</span>
                </button>

                {/* 5. Citação */}
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selected = content.substring(start, end) || 'Frase ou declaração em destaque...';
                    const replacement = `\n> "${selected}"\n`;
                    const newText = content.substring(0, start) + replacement + content.substring(end);
                    setContent(newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 4, start + 4 + selected.length);
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Inserir citação ou declaração em destaque"
                >
                  <Quote className="w-3.5 h-3.5 text-slate-500" />
                  <span>Citação</span>
                </button>

                {/* 6. Marcador */}
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const item = '\n• ';
                    const newText = content.substring(0, start) + item + content.substring(end);
                    setContent(newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + item.length, start + item.length);
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Inserir item com marcador"
                >
                  <List className="w-3.5 h-3.5 text-slate-500" />
                  <span>Marcador</span>
                </button>

                {/* 7. Link */}
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Cole o endereço do link (Ex: https://instagram.com/seuperfil):', 'https://');
                    if (!url) return;
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const cleanUrl = url.trim();
                    const newText = content.substring(0, start) + ` ${cleanUrl} ` + content.substring(end);
                    setContent(newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + cleanUrl.length + 2, start + cleanUrl.length + 2);
                    }, 50);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Inserir link direto"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Link</span>
                </button>

                {/* Limpar Tags HTML se houver código colado */}
                {/<[^>]+>/.test(content) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja converter o texto para formato simples, preservando as quebras de linha e removendo tags HTML estranhas?')) {
                        const stripped = content
                          .replace(/<br\s*[\/]?>/gi, '\n')
                          .replace(/<\/p>/gi, '\n\n')
                          .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> "$1"\n')
                          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                          .replace(/<[^>]+>/g, '')
                          .replace(/&nbsp;/g, ' ')
                          .trim();
                        setContent(stripped);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold text-xs flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                    title="Remover tags HTML do texto colado e deixar em formato limpo"
                  >
                    <span>Limpar Tags HTML</span>
                  </button>
                )}
              </div>

              {/* Editor Mode vs Live Preview Mode */}
              {contentTab === 'edit' ? (
                <div>
                  <textarea
                    ref={contentTextareaRef}
                    rows={isPodcast ? 8 : 16}
                    required={!isPodcast}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                      // Atalho Ctrl+B / Cmd+B para Negrito
                      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                        e.preventDefault();
                        handleToggleBold();
                      }
                      // Atalho Ctrl+Shift+U para Caixa Alta
                      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'u') {
                        e.preventDefault();
                        handleToggleUppercase();
                      }
                    }}
                    placeholder={
                      isPodcast
                        ? "Notas do episódio, links citados ou transcrição..."
                        : "Digite o texto da sua matéria normalmente aqui...\n\n• Use Enter para uma nova linha\n• Use Enter duas vezes para um novo parágrafo\n• Use o botão Negrito ou Ctrl+B para destacar trechos importantes\n• Use o botão Caixa Alta para títulos ou ênfase\n• Escolha a fonte desejada (Digital, Serifa, Times ou Mono) na barra acima\n\nTodos os espaços e quebras de linha que você digitar serão mantidos exatamente assim na publicação!"
                    }
                    className={`w-full p-4 bg-white border border-slate-300 rounded-xl text-sm sm:text-base text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600 leading-relaxed shadow-2xs transition-all ${
                      fontFamily === 'serif'
                        ? 'font-serif article-font-serif'
                        : fontFamily === 'times'
                        ? 'font-times article-font-times'
                        : fontFamily === 'mono'
                        ? 'font-mono article-font-mono'
                        : 'font-sans article-font-sans'
                    }`}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                      <Eye className="w-3.5 h-3.5 text-red-600" />
                      Visualização Exata do Leitor (Fonte: {fontFamily === 'serif' ? 'Serifada Jornalística' : fontFamily === 'times' ? 'Clássica Times' : fontFamily === 'mono' ? 'Máquina de Escrever' : 'Moderna Digital'})
                    </span>
                    <span className="text-[11px] text-slate-500">Espaçamentos e quebras de linha ativos</span>
                  </div>

                  <div className="p-6 max-h-[500px] overflow-y-auto">
                    {content.trim() ? (
                      <div
                        className={`article-content ${
                          fontFamily === 'serif'
                            ? 'font-serif article-font-serif'
                            : fontFamily === 'times'
                            ? 'font-times article-font-times'
                            : fontFamily === 'mono'
                            ? 'font-mono article-font-mono'
                            : 'font-sans article-font-sans'
                        }`}
                        dangerouslySetInnerHTML={{ __html: formatArticleContent(content) }}
                      />
                    ) : (
                      <p className="text-sm text-slate-400 italic text-center py-8">
                        Nenhum texto digitado ainda. Escreva no editor para ver a prévia formatada aqui.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Character and word counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>{content.trim() ? content.trim().split(/\s+/).length : 0} palavras • {content.length} caracteres</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Quebras de linha e espaçamento preservados no site
                </span>
              </div>
            </div>

            {/* Additional Images Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Fotos da Matéria (Máx. até 10 fotos por upload)
                </label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  additionalImages.length >= 10 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {additionalImages.length} de 10 fotos permitidas
                </span>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="url"
                  value={newAddImageUrl}
                  onChange={(e) => setNewAddImageUrl(e.target.value)}
                  placeholder="URL da imagem ou faça upload..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddAdditionalImage}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold shrink-0 transition-colors"
                >
                  Adicionar Link
                </button>
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {isUploadingGallery ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Fotos</span>
                    </>
                  )}
                </button>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryFileUpload}
                  className="hidden"
                />
              </div>

              {additionalImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {additionalImages.map((img, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-16/10 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalImage(i)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                        title="Remover imagem"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Facebook Options Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-blue-600 fill-current" />
                <span className="text-xs font-bold text-blue-900">Integração com o Facebook</span>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={facebookAutoPublish}
                  onChange={(e) => setFacebookAutoPublish(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Publicar automaticamente no Facebook ao salvar como "Publicado"
                </span>
              </label>

              <p className="text-[11px] text-slate-500 pl-6">
                Utiliza a imagem de destaque, o título como chamada, o resumo e o link oficial da notícia.
              </p>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                  <span>Visualizar Matéria</span>
                </button>

                {id && status === 'published' && (
                  <button
                    type="button"
                    disabled={isPublishingFb}
                    onClick={() => {
                      const cur = articles.find(a => a.id === id);
                      if (cur) handlePublishNowToFacebook(cur);
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Facebook className="w-4 h-4 fill-current" />
                    <span>{isPublishingFb ? 'Publicando...' : 'Publicar agora no Facebook'}</span>
                  </button>
                )}

                {id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(id, title || 'Esta matéria')}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Excluir Matéria</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPublishingFb}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {id ? 'Atualizar Matéria' : 'Salvar Matéria'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por título ou autor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-600"
          >
            <option value="all">Todos os Status</option>
            <option value="published">Apenas Publicados</option>
            <option value="draft">Apenas Rascunhos</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Matéria</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Facebook</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={article.featuredImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0 max-w-sm sm:max-w-md">
                        <p className="font-bold text-slate-900 line-clamp-1">{article.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{article.subtitle || 'Sem resumo'}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>Por {article.author}</span>
                          {article.youtubeUrl && (
                            <span className="flex items-center gap-0.5 text-red-600 font-bold">
                              <Play className="w-2.5 h-2.5 fill-current" /> Vídeo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
                      {article.categoryName}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(article.publishedAt))}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      article.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {article.status === 'published' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {article.facebookPublished ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                        <Facebook className="w-3.5 h-3.5 fill-current" />
                        Publicado
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePublishNowToFacebook(article)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors text-[11px]"
                        title="Publicar agora no Facebook"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                        <span>Publicar</span>
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setPreviewArticle(article);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        title="Pré-visualizar matéria"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setId(article.id);
                          setTitle(article.title);
                          setSubtitle(article.subtitle);
                          setCategoryId(article.categoryId);
                          setContent(article.content);
                          setFeaturedImage(article.featuredImage);
                          setImageCaption(article.imageCaption || '');
                          setAdditionalImages(article.additionalImages || []);
                          setAuthor(article.author);
                          setAuthorRole(article.authorRole || 'Redator');
                          setPublishedAt(new Date(article.publishedAt).toISOString().slice(0, 16));
                          setYoutubeUrl(article.youtubeUrl || '');
                          setStatus(article.status);
                          setFacebookAutoPublish(article.facebookAutoPublish);
                          setIsFormOpen(true);
                          window.scrollTo({ top: 100, behavior: 'smooth' });
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        title="Editar matéria"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(article.id, article.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title="Excluir matéria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewArticle && (
        <ArticlePreviewModal
          article={previewArticle}
          onClose={() => setPreviewArticle(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(articleToDelete)}
        title="Excluir Matéria"
        itemName={articleToDelete?.title}
        message="Tem certeza que deseja excluir esta matéria? Ela será removida permanentemente do portal e não será restaurada ao recarregar a página."
        confirmLabel="Sim, Excluir Definitivamente"
        onConfirm={executeConfirmDelete}
        onClose={() => setArticleToDelete(null)}
      />
    </div>
  );
};
