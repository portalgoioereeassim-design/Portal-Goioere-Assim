import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  Sparkles, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  Share2
} from 'lucide-react';
import { EventGallery, GalleryConfig } from '../types';
import { storageService } from '../services/storageService';

interface GalleriesPageProps {
  config?: GalleryConfig;
}

export const GalleriesPage: React.FC<GalleriesPageProps> = ({ config }) => {
  const [galleries, setGalleries] = useState<EventGallery[]>(() => storageService.getGalleries());
  const [galleryConfig, setGalleryConfig] = useState<GalleryConfig>(() => config || storageService.getGalleryConfig());
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const handleUpdate = () => {
      setGalleries(storageService.getGalleries());
      setGalleryConfig(config || storageService.getGalleryConfig());
    };
    window.addEventListener('portal_data_updated', handleUpdate);
    return () => window.removeEventListener('portal_data_updated', handleUpdate);
  }, [config]);
  
  // Lightbox Modal State
  const [activeGallery, setActiveGallery] = useState<EventGallery | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const filteredGalleries = useMemo(() => {
    if (!searchQuery.trim()) return galleries;
    const q = searchQuery.toLowerCase();
    return galleries.filter(g => 
      g.title.toLowerCase().includes(q) ||
      (g.location && g.location.toLowerCase().includes(q)) ||
      (g.subtitle && g.subtitle.toLowerCase().includes(q))
    );
  }, [galleries, searchQuery]);

  const openLightbox = (gallery: EventGallery, index: number = 0) => {
    setActiveGallery(gallery);
    setActivePhotoIndex(index);
  };

  const closeLightbox = () => {
    setActiveGallery(null);
    setActivePhotoIndex(0);
  };

  const nextPhoto = () => {
    if (!activeGallery) return;
    setActivePhotoIndex((prev) => (prev + 1) % activeGallery.photos.length);
  };

  const prevPhoto = () => {
    if (!activeGallery) return;
    setActivePhotoIndex((prev) => (prev - 1 + activeGallery.photos.length) % activeGallery.photos.length);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5" />
            <span>Coberturas Exclusivas</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            {galleryConfig.tabName || 'Galerias de Fotos (Eventos)'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Confira as melhores coberturas fotográficas dos maiores eventos, festas, shows e encontros da nossa cidade e região.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-md relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por evento, show ou local..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Galleries Grid */}
      {filteredGalleries.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
          <Camera className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
          <h3 className="text-base font-bold text-slate-700">Nenhuma galeria encontrada</h3>
          <p className="text-xs">Não encontramos coberturas de eventos para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGalleries.map((gallery) => (
            <article 
              key={gallery.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Cover Image with Photo Count */}
                <div 
                  className="relative aspect-video bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(gallery, 0)}
                >
                  <img
                    src={gallery.coverImage}
                    alt={gallery.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-xs font-bold flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-full">
                      <Camera className="w-3.5 h-3.5 text-red-400" />
                      Ver Álbum ({gallery.photos.length} Fotos)
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                    <span>{gallery.photos.length} fotos</span>
                  </div>

                  {gallery.showAsArticle && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Matéria</span>
                    </div>
                  )}
                </div>

                {/* Gallery Details */}
                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{gallery.eventDate || 'Data recente'}</span>
                    {gallery.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{gallery.location}</span>
                      </>
                    )}
                  </div>

                  <h3 
                    onClick={() => openLightbox(gallery, 0)}
                    className="font-bold text-base text-slate-900 group-hover:text-red-600 transition-colors cursor-pointer leading-snug"
                  >
                    {gallery.title}
                  </h3>

                  {gallery.subtitle && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {gallery.subtitle}
                    </p>
                  )}

                  {/* Thumbnail Row of Photos */}
                  {gallery.photos.length > 1 && (
                    <div className="flex gap-1.5 pt-2 overflow-hidden">
                      {gallery.photos.slice(0, 5).map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => openLightbox(gallery, pIdx)}
                          className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                        >
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {gallery.photos.length > 5 && (
                        <div 
                          onClick={() => openLightbox(gallery, 5)}
                          className="w-12 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors shrink-0"
                        >
                          +{gallery.photos.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => openLightbox(gallery, 0)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer pt-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Abrir Galeria</span>
                </button>

                {gallery.showAsArticle && gallery.articleId && (
                  <Link
                    to={`/noticia/${gallery.articleId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 pt-2"
                  >
                    <span>Ler Matéria</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeGallery && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
          onClick={closeLightbox}
        >
          {/* Lightbox Top Header */}
          <div 
            className="flex items-center justify-between text-white pb-4 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm sm:text-base text-white truncate max-w-xl">
                {activeGallery.title}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Foto {activePhotoIndex + 1} de {activeGallery.photos.length}</span>
                {activeGallery.location && <span>• {activeGallery.location}</span>}
                {activeGallery.eventDate && <span>• {activeGallery.eventDate}</span>}
              </p>
            </div>

            <button
              onClick={closeLightbox}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Active Photo Container with Prev/Next Controls */}
          <div 
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={prevPhoto}
              className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer"
              title="Foto Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <img
              src={activeGallery.photos[activePhotoIndex]}
              alt={`${activeGallery.title} - Foto ${activePhotoIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition-all"
            />

            <button
              type="button"
              onClick={nextPhoto}
              className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer"
              title="Próxima Foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Thumbnails Strip */}
          <div 
            className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {activeGallery.photos.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIndex(idx)}
                className={`w-14 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                  activePhotoIndex === idx ? 'border-red-500 scale-110 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={imgUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
