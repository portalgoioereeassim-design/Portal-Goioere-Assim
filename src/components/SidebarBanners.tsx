import React, { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, 
  Sparkles, 
  Heart, 
  Palette, 
  Handshake, 
  ChevronLeft, 
  ChevronRight, 
  Pause, 
  Play,
  Clock,
  Layers
} from 'lucide-react';
import { Banner, SidebarBannerDisplayMode } from '../types';
import { storageService } from '../services/storageService';

interface SidebarBannersProps {
  banners: Banner[];
  className?: string;
  onBannerClick?: (banner: Banner) => void;
  displayMode?: SidebarBannerDisplayMode;
}

interface SupporterBannerCardProps {
  banner: Banner;
  onBannerClick?: (banner: Banner) => void;
  className?: string;
}

export const SupporterBannerCard: React.FC<SupporterBannerCardProps> = ({ 
  banner, 
  onBannerClick, 
  className = '' 
}) => {
  const handleClick = () => {
    if (onBannerClick) {
      onBannerClick(banner);
    } else {
      storageService.recordBannerClick(banner.id);
      if (banner.targetUrl) {
        window.open(banner.targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const renderBadge = (b: Banner) => {
    const text = b.badgeText || (
      b.type === 'art' ? 'Arte & Cultura' :
      b.type === 'supporter' ? 'Apoiador Oficial' :
      b.type === 'partner' ? 'Parceiro' :
      'Publicidade'
    );

    if (b.type === 'art') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
          <Palette className="w-2.5 h-2.5 text-purple-600" />
          <span>{text}</span>
        </span>
      );
    }

    if (b.type === 'supporter') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
          <Heart className="w-2.5 h-2.5 text-rose-600" />
          <span>{text}</span>
        </span>
      );
    }

    if (b.type === 'partner') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
          <Handshake className="w-2.5 h-2.5 text-blue-600" />
          <span>{text}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div
      onClick={handleClick}
      className={`group block bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-300 ${
        banner.targetUrl ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Badge & Info Bar on top */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        {renderBadge(banner)}
        {banner.targetUrl && (
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-red-600 flex items-center gap-1 transition-colors">
            <span>Visitar</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Image container preserving natural aspect ratio without distortion */}
      <div className="relative w-full bg-slate-100 flex items-center justify-center overflow-hidden p-1.5 sm:p-2">
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-auto max-h-[460px] object-contain transition-transform duration-500 group-hover:scale-101"
          loading="lazy"
          style={{
            aspectRatio: banner.width && banner.height ? `${banner.width} / ${banner.height}` : 'auto'
          }}
        />
      </div>

      {/* Banner info - only rendered when showText is enabled */}
      {banner.showText !== false && (banner.title || banner.description) && (
        <div className="p-3.5 bg-white border-t border-slate-100">
          {banner.title && (
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
              {banner.title}
            </h4>
          )}
          {banner.description && (
            <p className="mt-1 text-[11px] sm:text-xs text-slate-500 line-clamp-3 leading-relaxed font-normal">
              {banner.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const SidebarBanners: React.FC<SidebarBannersProps> = ({ 
  banners, 
  className = '', 
  onBannerClick, 
  displayMode: propDisplayMode 
}) => {
  const activeBanners = banners
    .filter(b => b.position === 'sidebar' && b.active)
    .sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(() => {
    return storageService.getSidebarBannerInterval() || 5;
  });
  const [storedDisplayMode, setStoredDisplayMode] = useState<SidebarBannerDisplayMode>(() => {
    return storageService.getSidebarBannerDisplayMode() || 'stacked';
  });

  const effectiveMode = propDisplayMode || storedDisplayMode;

  // Listen for real-time interval and display mode changes from admin
  useEffect(() => {
    const handleIntervalUpdate = () => {
      setIntervalSeconds(storageService.getSidebarBannerInterval() || 5);
    };
    const handleDisplayModeUpdate = () => {
      setStoredDisplayMode(storageService.getSidebarBannerDisplayMode() || 'stacked');
    };
    window.addEventListener('portal_sidebar_interval_updated', handleIntervalUpdate);
    window.addEventListener('portal_sidebar_display_mode_updated', handleDisplayModeUpdate);
    return () => {
      window.removeEventListener('portal_sidebar_interval_updated', handleIntervalUpdate);
      window.removeEventListener('portal_sidebar_display_mode_updated', handleDisplayModeUpdate);
    };
  }, []);

  // Make sure currentIndex is within bounds
  useEffect(() => {
    if (currentIndex >= activeBanners.length) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Slideshow automatic rotation timer (only used in carousel mode)
  useEffect(() => {
    if (effectiveMode !== 'carousel' || activeBanners.length <= 1 || isPaused) return;

    const ms = Math.max(2, intervalSeconds) * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, ms);

    return () => clearInterval(timer);
  }, [effectiveMode, activeBanners.length, isPaused, intervalSeconds]);

  if (activeBanners.length === 0) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  return (
    <aside className={`space-y-4 ${className}`} aria-label="Apoiadores e Banners Laterais">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Apoiadores & Banners</span>
        </span>

        {effectiveMode === 'carousel' && activeBanners.length > 1 ? (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <span>{currentIndex + 1} / {activeBanners.length}</span>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="hover:text-slate-900 cursor-pointer p-0.5"
              title={isPaused ? 'Continuar reprodução automática' : 'Pausar reprodução automática'}
            >
              {isPaused ? <Play className="w-2.5 h-2.5 text-emerald-600" /> : <Pause className="w-2.5 h-2.5 text-slate-500" />}
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {activeBanners.length} {activeBanners.length === 1 ? 'destaque' : 'destaques'}
          </span>
        )}
      </div>

      {/* Mode 1: Stacked - One below the other (Solicitado: "onde ficara um abaixo do outro") */}
      {effectiveMode === 'stacked' ? (
        <div className="space-y-4 sm:space-y-5">
          {activeBanners.map((banner) => (
            <SupporterBannerCard 
              key={banner.id} 
              banner={banner} 
              onBannerClick={onBannerClick} 
            />
          ))}
        </div>
      ) : (
        /* Mode 2: Carousel / Slideshow */
        <div 
          className="relative group"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Render current slide */}
          <div className="transition-opacity duration-300">
            <SupporterBannerCard banner={currentBanner} onBannerClick={onBannerClick} />
          </div>

          {/* Carousel Navigation Arrows */}
          {activeBanners.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Banner anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-md cursor-pointer z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Próximo banner"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-md cursor-pointer z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Progress dots */}
          {activeBanners.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Ir para o banner ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex 
                      ? 'w-6 bg-rose-600' 
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

/**
 * Função utilitária para selecionar aleatoriamente / sucessivamente um banner lateral
 * para ser inserido abaixo de matérias em telas de celular (mobile).
 */
export function getRandomSidebarBanner(banners: Banner[], indexSeed: number): Banner | null {
  const active = banners.filter(b => b.position === 'sidebar' && b.active);
  if (active.length === 0) return null;
  // Multiplicador primo para espalhar aleatoriamente de forma determinística
  const idx = Math.abs(Math.floor(indexSeed * 7 + 3)) % active.length;
  return active[idx];
}

/**
 * Componente dedicado de banner intercalado abaixo de matéria em dispositivos móveis.
 */
export const MobileInterleavedBanner: React.FC<{
  banner: Banner | null;
  onBannerClick?: (banner: Banner) => void;
  className?: string;
}> = ({ banner, onBannerClick, className = '' }) => {
  if (!banner) return null;

  return (
    <div className={`block lg:hidden w-full my-3.5 sm:my-4 ${className}`} aria-label="Publicidade e Apoio">
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          <span>Publicidade & Apoio</span>
        </span>
      </div>
      <SupporterBannerCard banner={banner} onBannerClick={onBannerClick} />
    </div>
  );
};
