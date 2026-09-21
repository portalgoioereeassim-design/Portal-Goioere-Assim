import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, Store } from 'lucide-react';
import { Article, Category, Banner, BusinessGuideConfig, BusinessStore } from '../types';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { RecentArticlesCarousel } from '../components/RecentArticlesCarousel';
import { ArticleCard } from '../components/ArticleCard';
import { SidebarBanners, SupporterBannerCard, MobileInterleavedBanner, getRandomSidebarBanner } from '../components/SidebarBanners';

interface HomePageProps {
  articles: Article[];
  categories: Category[];
  banners: Banner[];
  businessConfig: BusinessGuideConfig;
  businessStores: BusinessStore[];
  onBannerClick: (banner: Banner) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  articles,
  categories,
  banners,
  businessConfig,
  businessStores,
  onBannerClick,
}) => {
  const navigate = useNavigate();
  const safeArticles = Array.isArray(articles) ? articles : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBanners = Array.isArray(banners) ? banners : [];
  const safeStores = Array.isArray(businessStores) ? businessStores : [];

  const publishedArticles = safeArticles.filter(a => a && a.status === 'published');
  const slideshowBanners = safeBanners.filter(b => b && b.position === 'slideshow' && b.active);
  const sidebarBanners = safeBanners.filter(b => b && b.position === 'sidebar' && b.active);
  const bodySlideshowBanners = safeBanners.filter(b => b && b.position === 'body_slideshow' && b.active);

  const handleOpenArticle = (slug: string) => {
    const article = safeArticles.find(a => a.slug === slug || a.id === slug);
    if (article?.categorySlug) {
      navigate(`/noticias/${article.categorySlug}/${article.slug || article.id}`);
    } else {
      navigate(`/noticias/${slug}`);
    }
  };

  // Determine if any categories matched articles
  const activeCategoriesWithArticles = [...safeCategories]
    .filter((category) => category.showOnHome !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((category) => {
      const catArticles = publishedArticles.filter(
        (a) => a.categoryId === category.id ||
               a.categoryId === category.slug ||
               a.categoryId?.replace(/^cat-/, '') === category.slug ||
               a.categoryId?.replace(/^cat-/, '') === category.id ||
               a.categorySlug === category.slug ||
               (a.categoryName && category.name && a.categoryName.toLowerCase() === category.name.toLowerCase())
      );
      return { category, articles: catArticles };
    })
    .filter(item => item.articles.length > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Large Top Slideshow Carousel */}
      {slideshowBanners.length > 0 && (
        <section aria-label="Slideshow de Destaques">
          <BannerSlideshow
            banners={slideshowBanners}
            onBannerClick={onBannerClick}
          />
        </section>
      )}

      {/* 2. Carrossel de Matérias Recentes */}
      {publishedArticles.length > 0 && (
        <RecentArticlesCarousel
          articles={publishedArticles}
          onSelectArticle={handleOpenArticle}
        />
      )}

      {/* 3. Main Content Grid: Categories Sections + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Categorized News Sections (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          {activeCategoriesWithArticles.length > 0 ? (
            activeCategoriesWithArticles.map(({ category, articles: catArticles }, catIndex) => {
              const [leadArticle, ...restArticles] = catArticles;
              const categoryUrl = `/noticias/${category.slug || category.id}`;

              return (
                <React.Fragment key={category.id}>
                  <section className="space-y-3.5">
                    {/* Section Header with Category Color Accent */}
                    <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                      <Link 
                        to={categoryUrl}
                        className="flex items-center gap-2.5 group"
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-xs shrink-0" 
                          style={{ backgroundColor: category.color || '#dc2626' }}
                        />
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-red-600 transition-colors tracking-tight">
                          {category.name}
                        </h2>
                      </Link>

                      <Link
                        to={categoryUrl}
                        className="text-xs font-bold text-slate-600 hover:text-red-600 flex items-center gap-1 transition-colors group cursor-pointer"
                      >
                        <span>Ver todas</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                    {/* Lead Article if available */}
                    {leadArticle && (
                      <div>
                        <ArticleCard
                          article={leadArticle}
                          featured={true}
                        />
                        {/* Em tela mobile: exibe aleatoriamente um banner lateral abaixo da matéria */}
                        {sidebarBanners.length > 0 && (
                          <div className="lg:hidden">
                            <MobileInterleavedBanner
                              banner={getRandomSidebarBanner(sidebarBanners, catIndex * 17 + 1)}
                              onBannerClick={onBannerClick}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secondary Cards in this category */}
                    {restArticles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
                        {restArticles.slice(0, 10).map((article, artIdx) => {
                          const mobileBannerForArticle = sidebarBanners.length > 0
                            ? getRandomSidebarBanner(sidebarBanners, catIndex * 31 + artIdx + 2)
                            : null;

                          return (
                            <React.Fragment key={article.id}>
                              <ArticleCard
                                article={article}
                              />
                              {/* Em tela mobile: exibe aleatoriamente um banner abaixo da matéria e assim sucessivamente */}
                              {mobileBannerForArticle && (
                                <div className="lg:hidden col-span-full">
                                  <MobileInterleavedBanner
                                    banner={mobileBannerForArticle}
                                    onBannerClick={onBannerClick}
                                  />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </React.Fragment>
              );
            })
          ) : publishedArticles.length > 0 ? (
            /* Fallback: Se as categorias não coincidiram perfeitamente com os IDs dos artigos, exibe todas as publicadas */
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-red-600 shrink-0" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Últimas Notícias
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {publishedArticles.slice(0, 10).map((art) => (
                  <ArticleCard key={art.id} article={art} onSelect={handleOpenArticle} />
                ))}
              </div>
            </section>
          ) : (
            /* Estado quando não há nenhuma matéria cadastrada ou publicada */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center my-4 shadow-xs">
              <h3 className="text-base font-bold text-slate-800 mb-1">Portal em Atualização</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                As publicações cadastradas no painel administrativo aparecerão aqui em tempo real.
              </p>
              <button
                onClick={() => navigate('/adm')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Acessar Painel Administrativo
              </button>
            </div>
          )}

          {/* Body Slideshow Carousel below the category blocks */}
          {bodySlideshowBanners.length > 0 && (
            <section aria-label="Banners em Destaque no Corpo" className="pt-2">
              <BannerSlideshow
                banners={bodySlideshowBanners}
                position="body_slideshow"
                onBannerClick={onBannerClick}
              />
            </section>
          )}
        </div>

        {/* Right Column: Responsive Sidebar with Banners & Latest News (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          {/* Trending / Fast News Block */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Mais Lidas do Momento
              </h3>
            </div>

            <div className="space-y-3.5">
              {publishedArticles.slice(0, 5).map((art, idx) => {
                const artUrl = art.categorySlug 
                  ? `/noticias/${art.categorySlug}/${art.slug || art.id}` 
                  : `/noticias/${art.slug || art.id}`;
                return (
                  <Link
                    key={art.id}
                    to={artUrl}
                    className="group flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0 cursor-pointer block"
                  >
                    <span className="text-xl font-black text-slate-300 group-hover:text-red-600 transition-colors w-6 shrink-0 leading-none mt-1">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase text-red-600">
                        {art.categoryName}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-2 mt-0.5 leading-snug">
                        {art.title}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Guia Empresarial Quick Spotlight Widget in Sidebar */}
          {businessConfig?.enabled !== false && safeStores.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold tracking-tight">
                    {businessConfig?.tabName || 'Guia Empresarial'}
                  </h3>
                </div>
                <Link
                  to="/guia-empresarial"
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Ver Guia →
                </Link>
              </div>

              <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                Conheça os melhores comércios e serviços da cidade com atendimento direto no WhatsApp.
              </p>

              <div className="space-y-2.5">
                {safeStores.slice(0, 3).map((store) => (
                  <Link
                    key={store.id}
                    to={`/guia-empresarial/${store.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer group border border-slate-700/40 block"
                  >
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-600"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                        {store.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {store.segment || store.category}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar Advertising Banners */}
          <div className="hidden lg:block">
            <SidebarBanners
              banners={sidebarBanners}
              onBannerClick={onBannerClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
