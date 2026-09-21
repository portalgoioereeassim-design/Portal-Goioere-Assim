import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Radio } from 'lucide-react';
import { Article, Banner } from '../types';
import { PodcastGallery } from '../components/PodcastGallery';
import { SidebarBanners } from '../components/SidebarBanners';

interface PodcastsPageProps {
  articles: Article[];
  banners?: Banner[];
}

export const PodcastsPage: React.FC<PodcastsPageProps> = ({ articles, banners = [] }) => {
  const navigate = useNavigate();

  const handleSelectArticle = (slugOrId: string) => {
    const art = articles.find(a => a.slug === slugOrId || a.id === slugOrId);
    if (art?.categorySlug) {
      navigate(`/noticias/${art.categorySlug}/${art.slug || art.id}`);
    } else {
      navigate(`/noticias/${slugOrId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap" aria-label="Navegação estrutural">
        <Link to="/" className="hover:text-red-600 font-medium cursor-pointer">Início</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-purple-600" />
          <span>Podcasts & Lives</span>
        </span>
      </nav>

      {/* Main Podcast Content & Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <PodcastGallery 
            articles={articles} 
            onSelectArticle={handleSelectArticle} 
            isEmbedded={false} 
          />
        </div>

        {/* Sidebar Banners Carousel */}
        <div className="lg:col-span-4">
          <SidebarBanners banners={banners} />
        </div>
      </div>
    </div>
  );
};
