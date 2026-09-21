import { 
  Article, 
  Category, 
  Banner, 
  VisualIdentity, 
  FacebookConfig, 
  FacebookLog, 
  BannerPosition, 
  SitePopup, 
  BusinessGuideConfig, 
  BusinessStore, 
  BusinessProductService,
  AdminUser,
  EventGallery,
  GalleryConfig,
  EventAgendaItem,
  NavigationMenuItem
} from '../types';
import { initialArticles, initialCategories, initialBanners, initialVisualIdentity, initialFacebookConfig, initialSitePopup } from '../data/initialData';
import { initialBusinessGuideConfig, initialBusinessStores, initialBusinessProducts } from '../data/initialBusinesses';
import { applyThemeColors, applyThemeTypography, applyFavicon, DEFAULT_COLORS, DEFAULT_TYPOGRAPHY } from './themeService';
import { supabaseSyncService } from './supabaseSyncService';

// Storage keys
const STORAGE_KEYS = {
  ARTICLES: 'portal_news_articles_v1',
  CATEGORIES: 'portal_news_categories_v1',
  MENU_ITEMS: 'portal_navigation_menu_items_v2',
  BANNERS: 'portal_news_banners_v1',
  IDENTITY: 'portal_news_identity_v1',
  FB_CONFIG: 'portal_news_fb_config_v1',
  FB_LOGS: 'portal_news_fb_logs_v1',
  ADMIN_AUTH: 'portal_news_admin_auth_v1',
  ADMIN_USERS: 'portal_admin_users_v2',
  GALLERIES: 'portal_event_galleries_v1',
  GALLERY_CONFIG: 'portal_gallery_config_v1',
  AGENDA: 'portal_event_agenda_v1',
  POPUP: 'portal_news_site_popup_v1',
  BUSINESS_CONFIG: 'portal_news_business_config_v1',
  BUSINESS_STORES: 'portal_news_business_stores_v1',
  BUSINESS_PRODUCTS: 'portal_news_business_products_v1',
};

// AI Studio mock article IDs that must be stripped in favor of real Supabase database content
export const MOCK_ARTICLE_IDS = new Set([
  'art-prefeito-goioere',
  'art-1',
  'art-2',
  'art-3',
  'art-4',
  'art-5',
  'art-6',
  'art-7',
  'art-8',
  'art-pod-1',
  'art-pod-2',
  'art-pod-3',
]);

// Categories matching Supabase database table 'categorias'
export const DEFAULT_DATABASE_CATEGORIES: Category[] = [
  { id: 'cat-cidade', name: 'Goioerê & Cidade', slug: 'cidade', order: 1, color: '#2563eb', description: 'Notícias do município de Goioerê, serviços públicos e comunidade', showOnHome: true },
  { id: 'cat-policial', name: 'Policial', slug: 'policial', order: 2, color: '#dc2626', description: 'Ocorrências, operações policiais, bombeiros e trânsito da comarca', showOnHome: true },
  { id: 'cat-politica', name: 'Política', slug: 'politica', order: 3, color: '#7c3aed', description: 'Câmara de vereadores, prefeitura, eleições e gestão regional', showOnHome: true },
  { id: 'cat-regiao', name: 'Região', slug: 'regiao', order: 4, color: '#059669', description: "Notícias de Moreira Sales, Rancho Alegre D'Oeste, Quarto Centenário e região", showOnHome: true },
  { id: 'cat-esportes', name: 'Esportes', slug: 'esportes', order: 5, color: '#ea580c', description: 'Futebol amador, campeonatos regionais e eventos esportivos', showOnHome: true },
  { id: 'cat-geral', name: 'Geral & Variedades', slug: 'geral', order: 6, color: '#475569', description: 'Cultura, eventos, utilidade pública e cotidiano', showOnHome: true },
  { id: 'cat-educacao', name: 'Educação', slug: 'educacao', order: 7, color: '#d97706', description: 'Inovações no ensino, escolas e universidades', showOnHome: true },
  { id: 'cat-saude', name: 'Saúde', slug: 'saude', order: 8, color: '#e11d48', description: 'Medicina, saúde pública e qualidade de vida', showOnHome: true },
  { id: 'cat-economia', name: 'Economia', slug: 'economia', order: 9, color: '#0d9488', description: 'Agronegócio, comércio, finanças e cooperativismo', showOnHome: true },
  { id: 'cat-entretenimento', name: 'Entretenimento', slug: 'entretenimento', order: 10, color: '#db2777', description: 'Cultura, lazer, eventos e variedades', showOnHome: true },
];

export interface AdminCredentials {
  email: string;
  password: string;
  updatedAt?: string;
}

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: 'user-default-1',
    username: '@Daniel1995',
    name: 'Daniel',
    password: '1010',
    role: 'Administrador Principal',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
];

const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  enabled: true,
  tabName: 'Galerias de Fotos (Eventos)',
};

const initialEventAgenda: EventAgendaItem[] = [
  {
    id: 'agenda-1',
    name: 'Mega Show de Aniversário & Festival Cultural',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
    date: '2026-10-15T20:00',
    contact: '(11) 98888-7777',
    location: 'Parque de Exposições Municipal',
    siteLink: 'https://eventos.com.br',
    description: 'Grande noite de celebração com atrações regionais e nacionais, praça gastronômica e muita música.',
    featured: true,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda-2',
    name: 'Corrida Rústica & Caminhada da Primavera 2026',
    bannerUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop',
    date: '2026-10-25T07:30',
    contact: '(11) 97777-6666',
    location: 'Largada: Praça Central',
    siteLink: 'https://corridaprimavera.com.br',
    description: 'Percursos de 5km e 10km para toda a família com medalha de participação e estrutura completa.',
    featured: false,
    active: true,
    createdAt: new Date().toISOString(),
  }
];

const initialEventGalleries: EventGallery[] = [
  {
    id: 'gal-1',
    title: 'Cobertura Especial: Grande Festa Tradicional da Cidade',
    subtitle: 'Confira as melhores fotos e momentos da grande celebração cultural que reuniu milhares de famílias.',
    eventDate: '2026-09-12',
    location: 'Centro de Convenções & Eventos',
    organizer: 'Secretaria Municipal de Cultura',
    coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop',
    ],
    showAsArticle: true,
    views: 184,
    createdAt: new Date().toISOString(),
  }
];

// YouTube ID Extractor helper
export function extractYoutubeId(url?: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

// Generate slug
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate stable 6-digit numeric code for articles (Ex: Geral/123476)
export function getArticleNumericCode(article: Partial<Article>): string {
  if (article.numericCode && /^\d+$/.test(article.numericCode)) {
    return article.numericCode;
  }
  if (article.id) {
    const digits = article.id.replace(/\D/g, '');
    if (digits.length >= 6) {
      return digits.slice(-6);
    }
  }
  const seed = (article.id || '') + (article.slug || '') + (article.title || '');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const code = (Math.abs(hash) % 900000 + 100000).toString();
  return code;
}

// Storage helpers
export const storageService = {
  isRemoteHydrating: false,

  // Admin Users System (Username & Password)
  getAdminUsers(): AdminUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
      if (data) {
        const parsed: AdminUser[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load admin users from storage', e);
    }
    // Seed with default user: @Daniel1995 / 1010
    this.saveAdminUsers(DEFAULT_ADMIN_USERS);
    return DEFAULT_ADMIN_USERS;
  },

  saveAdminUsers(users: AdminUser[]): AdminUser[] {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(users));
      window.dispatchEvent(new Event('portal_admin_users_updated'));
      window.dispatchEvent(new Event('portal_data_updated'));

      // Automatically sync admin users to Supabase
      supabaseSyncService.syncSingleConfig('admin_users', users).catch((err) => {
        console.warn('[Supabase Sync] Falha ao sincronizar admin_users:', err);
      });
    } catch (e) {
      console.error('Failed to save admin users to storage', e);
    }
    return users;
  },

  validateAdminUser(usernameInput: string, passInput: string): { success: boolean; user?: AdminUser } {
    const users = this.getAdminUsers();
    const cleanUser = (usernameInput || '').trim().toLowerCase();
    const cleanPass = (passInput || '').trim();

    const matched = users.find(u => {
      const uName = (u.username || '').trim().toLowerCase();
      // Allow matching with or without leading '@'
      const matchName = uName === cleanUser || 
                        uName === (cleanUser.startsWith('@') ? cleanUser : `@${cleanUser}`) ||
                        (uName.startsWith('@') ? uName.slice(1) : uName) === cleanUser;
      return matchName && u.password === cleanPass;
    });

    if (matched) {
      return { success: true, user: matched };
    }
    return { success: false };
  },

  // Legacy credentials backwards-compatibility
  getAdminCredentials(): AdminCredentials {
    const users = this.getAdminUsers();
    const primary = users[0] || DEFAULT_ADMIN_USERS[0];
    return {
      email: primary.username,
      password: primary.password,
    };
  },

  saveAdminCredentials(creds: { email: string; password: string }): AdminCredentials {
    const users = this.getAdminUsers();
    if (users.length > 0) {
      users[0].username = creds.email.trim();
      users[0].password = creds.password.trim();
      this.saveAdminUsers(users);
    } else {
      this.saveAdminUsers([{
        id: 'user-1',
        username: creds.email.trim(),
        name: 'Administrador',
        password: creds.password.trim(),
        role: 'Administrador',
        createdAt: new Date().toISOString(),
      }]);
    }
    return { email: creds.email.trim(), password: creds.password.trim() };
  },

  validateAdminCredentials(userOrEmail: string, pass: string): boolean {
    return this.validateAdminUser(userOrEmail, pass).success;
  },

  // Helper to get deleted IDs set
  getDeletedArticleIds(): Set<string> {
    try {
      const raw = localStorage.getItem('portal_deleted_article_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  getDeletedCategoryIds(): Set<string> {
    try {
      const raw = localStorage.getItem('portal_deleted_category_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  getDeletedBannerIds(): Set<string> {
    try {
      const raw = localStorage.getItem('portal_deleted_banner_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  // Articles
  getArticles(): Article[] {
    const deletedIds = this.getDeletedArticleIds();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);

      if (data !== null) {
        let parsed: Article[] = JSON.parse(data);
        let changed = false;

        // Clean out any deleted articles
        const cleaned = parsed.filter(a => !deletedIds.has(a.id));
        if (cleaned.length !== parsed.length) {
          parsed = cleaned;
          changed = true;
        }

        // Ensure every article has a valid URL-safe slug
        parsed = parsed.map(a => {
          if (!a.slug || a.slug.trim() === '') {
            changed = true;
            return { ...a, slug: slugify(a.title) };
          }
          return a;
        });

        if (changed) {
          this.saveArticles(parsed);
        }

        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load articles from storage', e);
    }

    // Default to initial articles filtered by deletedIds
    const seeded = initialArticles.filter(a => !deletedIds.has(a.id));
    return seeded.length > 0 ? seeded : initialArticles;
  },

  saveArticles(articles: Article[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
      window.dispatchEvent(new Event('portal_data_updated'));

      // Automatically sync articles with Supabase database only when not hydrating from remote
      if (!this.isRemoteHydrating) {
        supabaseSyncService.autoSyncRecord('articles', articles).catch((err) => {
          console.warn('[Supabase AutoSync] Falha ao sincronizar artigos:', err);
        });
      }
    } catch (e) {
      console.error('Failed to save articles to storage', e);
    }
  },

  getArticleById(id: string): Article | undefined {
    return this.getArticles().find(a => a.id === id);
  },

  getArticleBySlug(slug: string): Article | undefined {
    if (!slug) return undefined;
    const clean = slugify(slug);
    return this.getArticles().find(a => 
      a.slug === slug || 
      slugify(a.slug || '') === clean || 
      slugify(a.title || '') === clean || 
      a.id === slug
    );
  },

  saveArticle(article: Partial<Article> & { title: string; categoryId: string }): Article {
    const articles = this.getArticles();
    const categories = this.getCategories();
    const category = categories.find(c => c.id === article.categoryId);
    const categoryName = category ? category.name : 'Geral';

    let savedArticle: Article;

    if (article.id) {
      const index = articles.findIndex(a => a.id === article.id);
      if (index !== -1) {
        const existing = articles[index];
        const numCode = article.numericCode || existing.numericCode || getArticleNumericCode({ ...existing, ...article });
        savedArticle = {
          ...existing,
          ...article,
          numericCode: numCode,
          categoryName,
          slug: article.slug || slugify(article.title),
          fontFamily: article.fontFamily || existing.fontFamily || 'sans',
        } as Article;
        articles[index] = savedArticle;
      } else {
        const numCode = article.numericCode || getArticleNumericCode(article);
        savedArticle = {
          ...article,
          id: article.id,
          numericCode: numCode,
          slug: article.slug || slugify(article.title),
          categoryName,
          fontFamily: article.fontFamily || 'sans',
          views: article.views || 0,
          additionalImages: article.additionalImages || [],
          publishedAt: article.publishedAt || new Date().toISOString(),
          status: article.status || 'published',
          facebookAutoPublish: article.facebookAutoPublish ?? false,
          facebookPublished: article.facebookPublished ?? false,
        } as Article;
        articles.unshift(savedArticle);
      }
    } else {
      const newId = 'art-' + Date.now();
      const numCode = article.numericCode || getArticleNumericCode({ id: newId, title: article.title });
      savedArticle = {
        id: newId,
        numericCode: numCode,
        title: article.title,
        slug: slugify(article.title),
        subtitle: article.subtitle || '',
        content: article.content || '',
        fontFamily: article.fontFamily || 'sans',
        categoryId: article.categoryId,
        categoryName,
        featuredImage: article.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop',
        imageCaption: article.imageCaption || '',
        additionalImages: article.additionalImages || [],
        publishedAt: article.publishedAt || new Date().toISOString(),
        author: article.author || 'Redação',
        authorRole: article.authorRole || 'Redator',
        authorAvatar: article.authorAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
        youtubeUrl: article.youtubeUrl || '',
        status: article.status || 'published',
        views: 0,
        isHighlight: article.isHighlight ?? false,
        facebookAutoPublish: article.facebookAutoPublish ?? false,
        facebookPublished: false,
      };
      articles.unshift(savedArticle);
    }

    this.saveArticles(articles);

    // Directly sync to Supabase database (artigos table + registros_do_portal)
    supabaseSyncService.syncSingleArticle(savedArticle).catch((err) => {
      console.warn('[Supabase Sync] Falha ao sincronizar artigo com o banco de dados:', err);
    });

    return savedArticle;
  },

  deleteArticle(id: string): void {
    // 1. Permanently track in deleted IDs
    const deletedIds = this.getDeletedArticleIds();
    deletedIds.add(id);
    try {
      localStorage.setItem('portal_deleted_article_ids', JSON.stringify(Array.from(deletedIds)));
    } catch (e) {
      console.error('Failed to save deleted article id list:', e);
    }

    // 2. Directly filter and save without triggering cyclic re-reads
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
      let currentList: Article[] = data ? JSON.parse(data) : initialArticles;
      const updated = currentList.filter(a => a.id !== id && !deletedIds.has(a.id));
      localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(updated));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to delete article', e);
    }

    // Directly delete from Supabase database table
    supabaseSyncService.deleteSingleArticle(id).catch((err) => {
      console.warn('[Supabase Sync] Falha ao deletar artigo no Supabase:', err);
    });
  },

  incrementArticleViews(_id: string): void {
    // Views tracking is disabled per system specification
  },

  // Categories
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const deletedIds = this.getDeletedCategoryIds();

      if (data !== null) {
        let parsed: Category[] = JSON.parse(data);
        let changed = false;

        // Strip deleted categories (by id, slug, or lowercase name)
        if (deletedIds.size > 0) {
          const originalLen = parsed.length;
          parsed = parsed.filter(c => !deletedIds.has(c.id) && !deletedIds.has(c.slug) && !deletedIds.has((c.name || '').toLowerCase()));
          if (parsed.length !== originalLen) {
            changed = true;
          }
        }

        // Ensure categories are valid
        parsed.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Ensure each category has a clean name and slug
        parsed = parsed.map(c => {
          if (!c.slug) {
            changed = true;
            return { ...c, slug: slugify(c.name || c.id) };
          }
          return c;
        });

        if (changed) {
          try {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }

        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }

    // Fallback to DEFAULT_DATABASE_CATEGORIES
    const deletedIds = this.getDeletedCategoryIds();
    const seeded = DEFAULT_DATABASE_CATEGORIES.filter(c => !deletedIds.has(c.id) && !deletedIds.has(c.slug) && !deletedIds.has(c.name.toLowerCase()));
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(seeded));
    } catch {
      // ignore
    }
    return seeded;
  },

  getCategoryBySlug(slug: string): Category | undefined {
    if (!slug) return undefined;
    const clean = slugify(slug);
    const stripped = clean.startsWith('cat-') ? clean.replace(/^cat-/, '') : clean;
    return this.getCategories().find(c =>
      c.slug === slug ||
      slugify(c.slug || '') === clean ||
      slugify(c.slug || '') === stripped ||
      slugify(c.name || '') === clean ||
      c.id === slug ||
      (c.id.startsWith('cat-') && c.id.replace(/^cat-/, '') === clean) ||
      (c.id.startsWith('cat-') && c.id.replace(/^cat-/, '') === stripped)
    );
  },

  saveCategories(categories: Category[]): void {
    try {
      const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(sorted));
      window.dispatchEvent(new Event('portal_data_updated'));

      // Automatically sync categories with Supabase database only when not hydrating from remote
      if (!this.isRemoteHydrating) {
        supabaseSyncService.autoSyncRecord('categories', sorted).catch((err) => {
          console.warn('[Supabase AutoSync] Falha ao sincronizar categorias:', err);
        });
      }
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  },

  saveCategory(category: Partial<Category> & { name: string }): Category {
    const categories = this.getCategories();
    let saved: Category;

    if (category.id) {
      const idx = categories.findIndex(c => c.id === category.id);
      if (idx !== -1) {
        saved = { ...categories[idx], ...category, slug: category.slug || slugify(category.name) };
        categories[idx] = saved;
      } else {
        saved = {
          id: category.id,
          name: category.name,
          slug: slugify(category.name),
          order: category.order || categories.length + 1,
          color: category.color || '#2563eb',
          description: category.description || '',
          showOnHome: category.showOnHome ?? true,
          hideInMenu: category.hideInMenu ?? false,
        };
        categories.push(saved);
      }
    } else {
      saved = {
        id: 'cat-' + Date.now(),
        name: category.name,
        slug: slugify(category.name),
        order: category.order || categories.length + 1,
        color: category.color || '#2563eb',
        description: category.description || '',
        showOnHome: category.showOnHome ?? true,
        hideInMenu: category.hideInMenu ?? false,
      };
      categories.push(saved);
    }

    this.saveCategories(categories.sort((a, b) => a.order - b.order));

    // Un-delete if this category was previously in deleted IDs
    try {
      const deleted = this.getDeletedCategoryIds();
      deleted.delete(saved.id);
      deleted.delete(saved.id.replace(/^cat-/, ''));
      if (saved.slug) deleted.delete(saved.slug);
      if (saved.name) deleted.delete(saved.name.toLowerCase());
      localStorage.setItem('portal_deleted_category_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    // Keep navigation menu items synchronized
    try {
      const menuItems = this.getNavigationMenuItems();
      const cleanId = saved.id.replace(/^cat-/, '');
      const existingIdx = menuItems.findIndex(m => 
        m.categoryId === saved.id || 
        m.categoryId === cleanId || 
        m.id === saved.id || 
        m.id === `cat-${cleanId}` ||
        m.id === `cat-${saved.id}`
      );
      if (existingIdx !== -1) {
        menuItems[existingIdx] = {
          ...menuItems[existingIdx],
          label: saved.name,
          color: saved.color,
          path: `/noticias/${saved.slug}`,
          enabled: !saved.hideInMenu,
        };
        this.saveNavigationMenuItems(menuItems);
      } else {
        const newItem: NavigationMenuItem = {
          id: `cat-${cleanId}`,
          label: saved.name,
          path: `/noticias/${saved.slug}`,
          type: 'category',
          categoryId: saved.id,
          color: saved.color,
          order: menuItems.length + 1,
          enabled: !saved.hideInMenu,
        };
        menuItems.push(newItem);
        this.saveNavigationMenuItems(menuItems);
      }
    } catch (e) {
      console.warn('Failed to sync saved category to menu items:', e);
    }

    // Directly sync to Supabase database (categorias table + registros_do_portal)
    supabaseSyncService.syncSingleCategory(saved).catch((err) => {
      console.warn('[Supabase Sync] Falha ao sincronizar categoria:', err);
    });

    window.dispatchEvent(new Event('portal_data_updated'));

    return saved;
  },

  deleteCategory(id: string, categorySlug?: string): boolean {
    const rawId = id.replace(/^cat-/, '');
    const currentCats = this.getCategories();
    const targetCat = currentCats.find(c => 
      c.id === id || 
      c.slug === id || 
      c.id === `cat-${id}` || 
      c.id.replace(/^cat-/, '') === rawId ||
      (categorySlug && (c.slug === categorySlug || c.id === categorySlug))
    );

    const targetId = targetCat?.id || id;
    const targetCleanId = targetId.replace(/^cat-/, '');
    const targetSlug = targetCat?.slug || categorySlug || targetCleanId;

    const deletedIds = this.getDeletedCategoryIds();
    deletedIds.add(targetId);
    deletedIds.add(targetCleanId);
    deletedIds.add(`cat-${targetCleanId}`);
    if (targetSlug) deletedIds.add(targetSlug);
    if (targetCat?.name) deletedIds.add(targetCat.name.toLowerCase());

    try {
      localStorage.setItem('portal_deleted_category_ids', JSON.stringify(Array.from(deletedIds)));
    } catch (e) {
      console.error('Failed to save deleted category id:', e);
    }

    const filtered = currentCats.filter(c => {
      if (c.id === targetId || c.id === `cat-${targetId}` || c.id === targetCleanId) return false;
      if (c.slug && (c.slug === targetSlug || c.slug === targetCleanId)) return false;
      return true;
    });
    this.saveCategories(filtered);

    // Keep navigation menu items synchronized on category deletion
    try {
      const menuItems = this.getNavigationMenuItems();
      const filteredMenu = menuItems.filter(m => {
        if (m.type !== 'category') return true;
        if (m.categoryId === targetId || m.categoryId === targetCleanId || m.categoryId === `cat-${targetCleanId}`) return false;
        if (m.id === targetId || m.id === `cat-${targetCleanId}` || m.id === `cat-${targetId}` || m.id === `cat-cat-${targetCleanId}`) return false;
        if (m.path === `/noticias/${targetSlug}` || m.path === `/noticias/${targetCleanId}`) return false;
        return true;
      });
      this.saveNavigationMenuItems(filteredMenu);
    } catch (e) {
      console.warn('Failed to sync deleted category from menu items:', e);
    }

    // Directly delete from Supabase database
    supabaseSyncService.deleteSingleCategory(targetId, targetSlug).catch((err) => {
      console.warn('[Supabase Sync] Falha ao deletar categoria no Supabase:', err);
    });

    // If any articles were under this deleted category, reassign them to the first remaining category or 'Geral'
    const fallbackCat = filtered[0] || { id: 'cat-geral', name: 'Geral', slug: 'geral' };
    const articles = this.getArticles().map(a => {
      if (
        a.categoryId === targetId || 
        a.categoryId === targetCleanId || 
        (targetSlug && (a.categorySlug === targetSlug || a.categoryId === targetSlug))
      ) {
        return {
          ...a,
          categoryId: fallbackCat.id,
          categoryName: fallbackCat.name,
          categorySlug: fallbackCat.slug,
        };
      }
      return a;
    });
    this.saveArticles(articles);

    window.dispatchEvent(new Event('portal_data_updated'));

    return true;
  },

  // Navigation Menu Management (Header Tabs & Categories)
  getDefaultSystemMenuItems(): NavigationMenuItem[] {
    return [
      {
        id: 'nav-home',
        label: 'Início',
        path: '/',
        type: 'system',
        systemKey: 'home',
        order: 1,
        enabled: true,
      },
      {
        id: 'nav-ultimas',
        label: 'Últimas Notícias',
        path: '/noticias',
        type: 'system',
        systemKey: 'ultimas',
        order: 2,
        enabled: true,
        color: '#dc2626',
      },
      {
        id: 'nav-guia',
        label: 'Guia Empresarial',
        path: '/guia-empresarial',
        type: 'system',
        systemKey: 'guia',
        order: 3,
        enabled: true,
        color: '#059669',
      },
      {
        id: 'nav-galerias',
        label: 'Galerias de Fotos (Eventos)',
        path: '/galerias',
        type: 'system',
        systemKey: 'galerias',
        order: 4,
        enabled: true,
        color: '#9333ea',
      },
      {
        id: 'nav-agenda',
        label: 'Agenda de Eventos',
        path: '/agenda',
        type: 'system',
        systemKey: 'agenda',
        order: 5,
        enabled: true,
        color: '#f59e0b',
      },
      {
        id: 'nav-podcasts',
        label: 'Podcasts & Lives',
        path: '/podcasts',
        type: 'system',
        systemKey: 'podcasts',
        order: 6,
        enabled: true,
        color: '#8b5cf6',
      },
    ];
  },

  getNavigationMenuItems(): NavigationMenuItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      let stored: NavigationMenuItem[] = [];
      if (raw) {
        try {
          stored = JSON.parse(raw);
        } catch {
          stored = [];
        }
      }

      const defaultSystems = this.getDefaultSystemMenuItems();
      const categories = this.getCategories();

      // Ensure all 6 default system items exist
      const systemItems: NavigationMenuItem[] = defaultSystems.map((sys) => {
        const existing = stored.find(s => s.id === sys.id || (s.type === 'system' && s.systemKey === sys.systemKey));
        if (existing) {
          return {
            ...sys,
            ...existing,
            path: sys.path,
            type: 'system' as const,
            systemKey: sys.systemKey,
          };
        }
        return sys;
      });

      // Ensure all current categories exist
      const categoryItems: NavigationMenuItem[] = categories.map((cat, idx) => {
        const cleanId = cat.id.replace(/^cat-/, '');
        const canonicalCatId = `cat-${cleanId}`;
        const existing = stored.find(s => 
          s.categoryId === cat.id || 
          s.categoryId === cleanId || 
          s.id === cat.id || 
          s.id === canonicalCatId ||
          s.id === `cat-${cat.id}` ||
          (s.type === 'category' && (s.path === `/noticias/${cat.slug}` || s.path === `/noticias/${cleanId}`))
        );
        if (existing) {
          return {
            ...existing,
            id: canonicalCatId,
            label: existing.label || cat.name,
            color: cat.color || existing.color || '#2563eb',
            path: `/noticias/${cat.slug || cleanId}`,
            categoryId: cat.id,
            type: 'category' as const,
            enabled: existing.enabled ?? !cat.hideInMenu,
          };
        }
        return {
          id: canonicalCatId,
          label: cat.name,
          path: `/noticias/${cat.slug || cleanId}`,
          type: 'category' as const,
          categoryId: cat.id,
          color: cat.color || '#2563eb',
          order: 10 + (cat.order || (idx + 1)),
          enabled: !cat.hideInMenu,
        };
      });

      // Merge items
      const allItems: NavigationMenuItem[] = [...systemItems];
      for (const catItem of categoryItems) {
        if (!allItems.some(item => item.id === catItem.id || item.categoryId === catItem.categoryId)) {
          allItems.push(catItem);
        }
      }

      // Preserve explicit order from stored list
      if (stored.length > 0) {
        const orderMap = new Map<string, number>();
        stored.forEach((item, index) => {
          if (item.id) orderMap.set(item.id, index);
          if (item.systemKey) orderMap.set(item.systemKey, index);
          if (item.categoryId) orderMap.set(item.categoryId, index);
        });

        allItems.sort((a, b) => {
          const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : (a.order ?? 999);
          const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : (b.order ?? 999);
          return orderA - orderB;
        });
      } else {
        allItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }

      // Normalize sequential 1..N order
      return allItems.map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));
    } catch (e) {
      console.error('Failed to load navigation menu items:', e);
      return this.getDefaultSystemMenuItems();
    }
  },

  saveNavigationMenuItems(items: NavigationMenuItem[]): void {
    try {
      const normalized = items.map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(normalized));

      // Synchronize category order and visibility in categories list
      const categories = this.getCategories();
      let categoriesChanged = false;
      const updatedCategories = categories.map(cat => {
        const menuItem = normalized.find(m => m.categoryId === cat.id || m.id === `cat-${cat.id}`);
        if (menuItem) {
          categoriesChanged = true;
          return {
            ...cat,
            name: menuItem.label || cat.name,
            order: menuItem.order,
            hideInMenu: !menuItem.enabled,
          };
        }
        return cat;
      });

      if (categoriesChanged) {
        const sortedCats = [...updatedCategories].sort((a, b) => (a.order || 0) - (b.order || 0));
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(sortedCats));
      }

      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save navigation menu items:', e);
    }
  },

  resetNavigationMenuItems(): NavigationMenuItem[] {
    try {
      localStorage.removeItem(STORAGE_KEYS.MENU_ITEMS);
      const defaults = this.getNavigationMenuItems();
      this.saveNavigationMenuItems(defaults);
      return defaults;
    } catch (e) {
      console.error('Failed to reset navigation menu items:', e);
      return this.getDefaultSystemMenuItems();
    }
  },

  // Banners
  getBanners(): Banner[] {
    const deletedIds = this.getDeletedBannerIds();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BANNERS);

      if (data !== null) {
        let parsed: Banner[] = JSON.parse(data);
        if (deletedIds.size > 0) {
          parsed = parsed.filter(b => !deletedIds.has(b.id));
        }
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load banners', e);
    }
    const seeded = initialBanners.filter(b => !deletedIds.has(b.id));
    return seeded.length > 0 ? seeded : initialBanners;
  },

  saveBanners(banners: Banner[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save banners', e);
    }
  },

  saveBanner(banner: Partial<Banner> & { title: string; imageUrl: string; position: BannerPosition }): Banner {
    const banners = this.getBanners();
    let saved: Banner;

    if (banner.id) {
      const idx = banners.findIndex(b => b.id === banner.id);
      if (idx !== -1) {
        saved = { ...banners[idx], ...banner } as Banner;
        banners[idx] = saved;
      } else {
        saved = {
          ...banner,
          id: banner.id,
          order: banner.order || banners.length + 1,
          active: banner.active ?? true,
          clicks: banner.clicks || 0,
        } as Banner;
        banners.push(saved);
      }
    } else {
      saved = {
        id: 'ban-' + Date.now(),
        title: banner.title,
        description: banner.description || '',
        imageUrl: banner.imageUrl,
        targetUrl: banner.targetUrl || '',
        position: banner.position,
        order: banner.order || banners.length + 1,
        active: banner.active ?? true,
        aspectRatio: banner.aspectRatio,
        width: banner.width,
        height: banner.height,
        clicks: 0,
        type: banner.type || (banner.position === 'sidebar' ? 'supporter' : 'commercial'),
        badgeText: banner.badgeText || '',
        showText: banner.showText ?? true,
      };
      banners.push(saved);
    }

    this.saveBanners(banners.sort((a, b) => a.order - b.order));

    // Directly sync to Supabase database (banners table + registros_do_portal)
    supabaseSyncService.syncSingleBanner(saved).catch((err) => {
      console.warn('[Supabase Sync] Falha ao sincronizar banner:', err);
    });

    return saved;
  },

  deleteBanner(id: string): void {
    const deletedIds = this.getDeletedBannerIds();
    deletedIds.add(id);
    try {
      localStorage.setItem('portal_deleted_banner_ids', JSON.stringify(Array.from(deletedIds)));
    } catch (e) {
      console.error('Failed to save deleted banner id:', e);
    }
    const banners = this.getBanners().filter(b => b.id !== id);
    this.saveBanners(banners);

    // Directly delete from Supabase database
    supabaseSyncService.deleteSingleBanner(id).catch((err) => {
      console.warn('[Supabase Sync] Falha ao deletar banner no Supabase:', err);
    });
  },

  incrementBannerClicks(id: string): void {
    const banners = this.getBanners();
    const banner = banners.find(b => b.id === id);
    if (banner) {
      banner.clicks = (banner.clicks || 0) + 1;
      this.saveBanners(banners);
    }
  },

  recordBannerClick(id: string): void {
    const banners = this.getBanners();
    const b = banners.find(item => item.id === id);
    if (b) {
      b.clicks = (b.clicks || 0) + 1;
      this.saveBanners(banners);
    }
  },

  getSidebarBannerInterval(): number {
    try {
      const val = localStorage.getItem('portal_sidebar_banner_interval');
      if (val) {
        const num = parseInt(val, 10);
        if (num >= 2 && num <= 30) return num;
      }
    } catch {
      // ignore
    }
    return 5; // Padrão 5 segundos
  },

  saveSidebarBannerInterval(seconds: number): void {
    try {
      const clamped = Math.max(2, Math.min(30, Math.round(seconds)));
      localStorage.setItem('portal_sidebar_banner_interval', clamped.toString());
      window.dispatchEvent(new Event('portal_data_updated'));
      window.dispatchEvent(new Event('portal_sidebar_interval_updated'));
      supabaseSyncService.syncSingleConfig('sidebar_banner_interval', { interval: clamped }).catch(() => {});
    } catch (e) {
      console.error('Failed to save sidebar banner interval', e);
    }
  },

  getSidebarBannerDisplayMode(): 'stacked' | 'carousel' {
    try {
      const val = localStorage.getItem('portal_sidebar_banner_display_mode');
      if (val === 'carousel' || val === 'stacked') return val;
    } catch {
      // ignore
    }
    // Padrão 'stacked' ("onde ficara um abaixo do outro")
    return 'stacked';
  },

  saveSidebarBannerDisplayMode(mode: 'stacked' | 'carousel'): void {
    try {
      localStorage.setItem('portal_sidebar_banner_display_mode', mode);
      window.dispatchEvent(new Event('portal_data_updated'));
      window.dispatchEvent(new Event('portal_sidebar_display_mode_updated'));
      supabaseSyncService.syncSingleConfig('sidebar_banner_display_mode', { mode }).catch(() => {});
    } catch (e) {
      console.error('Failed to save sidebar banner display mode', e);
    }
  },

  // Visual Identity
  getVisualIdentity(): VisualIdentity {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IDENTITY);
      if (data) {
        const parsed = JSON.parse(data);
        const merged: VisualIdentity = {
          ...initialVisualIdentity,
          ...parsed,
          colors: {
            ...DEFAULT_COLORS,
            ...(initialVisualIdentity.colors || {}),
            ...(parsed.colors || {})
          },
          typography: {
            ...DEFAULT_TYPOGRAPHY,
            ...(initialVisualIdentity.typography || {}),
            ...(parsed.typography || {})
          },
          socialMedia: {
            ...initialVisualIdentity.socialMedia,
            ...(parsed.socialMedia || {})
          }
        };
        applyThemeColors(merged.colors);
        applyThemeTypography(merged.typography);
        if (merged.faviconUrl) {
          applyFavicon(merged.faviconUrl);
        }
        return merged;
      }
    } catch (e) {
      console.error('Failed to load visual identity', e);
    }
    this.saveVisualIdentity(initialVisualIdentity);
    applyThemeColors(initialVisualIdentity.colors);
    applyThemeTypography(initialVisualIdentity.typography);
    if (initialVisualIdentity.faviconUrl) {
      applyFavicon(initialVisualIdentity.faviconUrl);
    }
    return initialVisualIdentity;
  },

  saveVisualIdentity(identity: VisualIdentity): void {
    try {
      const merged: VisualIdentity = {
        ...initialVisualIdentity,
        ...identity,
        colors: {
          ...DEFAULT_COLORS,
          ...(initialVisualIdentity.colors || {}),
          ...(identity.colors || {})
        },
        typography: {
          ...DEFAULT_TYPOGRAPHY,
          ...(initialVisualIdentity.typography || {}),
          ...(identity.typography || {})
        }
      };
      localStorage.setItem(STORAGE_KEYS.IDENTITY, JSON.stringify(merged));
      applyThemeColors(merged.colors);
      applyThemeTypography(merged.typography);
      if (merged.faviconUrl) {
        applyFavicon(merged.faviconUrl);
      }
      window.dispatchEvent(new Event('portal_data_updated'));

      supabaseSyncService.syncSingleConfig('identidade_visual', merged).catch((err) => {
        console.warn('[Supabase Sync] Falha ao sincronizar identidade visual:', err);
      });
    } catch (e) {
      console.error('Failed to save visual identity', e);
    }
  },

  // Facebook Config
  getFacebookConfig(): FacebookConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FB_CONFIG);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load FB config', e);
    }
    this.saveFacebookConfig(initialFacebookConfig);
    return initialFacebookConfig;
  },

  saveFacebookConfig(config: FacebookConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FB_CONFIG, JSON.stringify(config));
      window.dispatchEvent(new Event('portal_data_updated'));

      supabaseSyncService.syncSingleConfig('facebook_config', config).catch((err) => {
        console.warn('[Supabase Sync] Falha ao sincronizar facebook config:', err);
      });
    } catch (e) {
      console.error('Failed to save FB config', e);
    }
  },

  // Facebook Logs
  getFacebookLogs(): FacebookLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FB_LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load FB logs', e);
    }
    return [
      {
        id: 'log-1',
        articleId: 'art-1',
        articleTitle: 'Congresso aprova novo marco da transição energética com foco em energias limpas',
        timestamp: '2026-09-11T09:32:00Z',
        status: 'success',
        message: 'Publicação realizada com sucesso na Página do Facebook.',
        facebookPostId: 'fb_post_99214481_01'
      }
    ];
  },

  addFacebookLog(log: Omit<FacebookLog, 'id'>): void {
    const logs = this.getFacebookLogs();
    const newLog: FacebookLog = {
      ...log,
      id: 'log-' + Date.now(),
    };
    logs.unshift(newLog);
    // Keep max 50 logs
    const trimmed = logs.slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEYS.FB_LOGS, JSON.stringify(trimmed));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save FB log', e);
    }
  },

  clearFacebookLogs(): void {
    localStorage.removeItem(STORAGE_KEYS.FB_LOGS);
    window.dispatchEvent(new Event('portal_data_updated'));
  },

  // Site PopUp with Attached Image
  getSitePopup(): SitePopup {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.POPUP);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...initialSitePopup,
          ...parsed,
        };
      }
      localStorage.setItem(STORAGE_KEYS.POPUP, JSON.stringify(initialSitePopup));
    } catch (e) {
      console.error('Failed to load site popup from storage', e);
    }
    return initialSitePopup;
  },

  saveSitePopup(popup: Partial<SitePopup>): SitePopup {
    try {
      let current = initialSitePopup;
      try {
        const data = localStorage.getItem(STORAGE_KEYS.POPUP);
        if (data) {
          current = { ...initialSitePopup, ...JSON.parse(data) };
        }
      } catch {
        current = initialSitePopup;
      }

      const updated: SitePopup = {
        ...current,
        ...popup,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.POPUP, JSON.stringify(updated));
      window.dispatchEvent(new Event('portal_data_updated'));

      supabaseSyncService.syncSingleConfig('site_popup', updated).catch((err) => {
        console.warn('[Supabase Sync] Falha ao sincronizar popup:', err);
      });

      return updated;
    } catch (e) {
      console.error('Failed to save site popup', e);
      return initialSitePopup;
    }
  },

  // Business Guide (Guia Empresarial) Configuration
  getBusinessGuideConfig(): BusinessGuideConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUSINESS_CONFIG);
      if (data) {
        return {
          ...initialBusinessGuideConfig,
          ...JSON.parse(data),
        };
      }
      localStorage.setItem(STORAGE_KEYS.BUSINESS_CONFIG, JSON.stringify(initialBusinessGuideConfig));
    } catch (e) {
      console.error('Failed to load business guide config', e);
    }
    return initialBusinessGuideConfig;
  },

  saveBusinessGuideConfig(config: Partial<BusinessGuideConfig>): BusinessGuideConfig {
    try {
      let current = initialBusinessGuideConfig;
      try {
        const data = localStorage.getItem(STORAGE_KEYS.BUSINESS_CONFIG);
        if (data) {
          current = { ...initialBusinessGuideConfig, ...JSON.parse(data) };
        }
      } catch {
        current = initialBusinessGuideConfig;
      }

      const updated: BusinessGuideConfig = {
        ...current,
        ...config,
      };
      localStorage.setItem(STORAGE_KEYS.BUSINESS_CONFIG, JSON.stringify(updated));
      window.dispatchEvent(new Event('portal_data_updated'));
      return updated;
    } catch (e) {
      console.error('Failed to save business guide config', e);
      return initialBusinessGuideConfig;
    }
  },

  // Business Stores (Lojas do Guia)
  getBusinessStores(): BusinessStore[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUSINESS_STORES);
      if (data) {
        const parsed: BusinessStore[] = JSON.parse(data);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load business stores', e);
    }
    this.saveBusinessStores(initialBusinessStores);
    return initialBusinessStores;
  },

  saveBusinessStores(stores: BusinessStore[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BUSINESS_STORES, JSON.stringify(stores));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save business stores', e);
    }
  },

  saveBusinessStore(store: BusinessStore): void {
    const stores = this.getBusinessStores();
    const index = stores.findIndex(s => s.id === store.id);
    if (index >= 0) {
      stores[index] = store;
    } else {
      stores.unshift(store);
    }
    this.saveBusinessStores(stores);
  },

  deleteBusinessStore(id: string): void {
    const stores = this.getBusinessStores().filter(s => s.id !== id);
    this.saveBusinessStores(stores);
    // Also delete associated products
    const products = this.getBusinessProducts().filter(p => p.businessId !== id);
    this.saveBusinessProducts(products);
  },

  // Business Products / Services (Produtos e Serviços)
  getBusinessProducts(businessId?: string): BusinessProductService[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUSINESS_PRODUCTS);
      if (data) {
        const parsed: BusinessProductService[] = JSON.parse(data);
        if (businessId) {
          return parsed.filter(p => p.businessId === businessId);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load business products', e);
    }
    this.saveBusinessProducts(initialBusinessProducts);
    if (businessId) {
      return initialBusinessProducts.filter(p => p.businessId === businessId);
    }
    return initialBusinessProducts;
  },

  saveBusinessProducts(products: BusinessProductService[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BUSINESS_PRODUCTS, JSON.stringify(products));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save business products', e);
    }
  },

  saveBusinessProduct(product: BusinessProductService): void {
    const products = this.getBusinessProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    this.saveBusinessProducts(products);
  },

  deleteBusinessProduct(id: string): void {
    const products = this.getBusinessProducts().filter(p => p.id !== id);
    this.saveBusinessProducts(products);
  },

  // Event Photo Galleries (Galerias de Fotos de Eventos)
  getGalleryConfig(): GalleryConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GALLERY_CONFIG);
      if (data) {
        return {
          ...DEFAULT_GALLERY_CONFIG,
          ...JSON.parse(data),
        };
      }
    } catch (e) {
      console.error('Failed to load gallery config', e);
    }
    return DEFAULT_GALLERY_CONFIG;
  },

  saveGalleryConfig(config: Partial<GalleryConfig>): GalleryConfig {
    try {
      let current = DEFAULT_GALLERY_CONFIG;
      try {
        const data = localStorage.getItem(STORAGE_KEYS.GALLERY_CONFIG);
        if (data) {
          current = { ...DEFAULT_GALLERY_CONFIG, ...JSON.parse(data) };
        }
      } catch {
        current = DEFAULT_GALLERY_CONFIG;
      }
      const updated: GalleryConfig = {
        ...current,
        ...config,
      };
      localStorage.setItem(STORAGE_KEYS.GALLERY_CONFIG, JSON.stringify(updated));
      window.dispatchEvent(new Event('portal_data_updated'));
      return updated;
    } catch (e) {
      console.error('Failed to save gallery config', e);
      return DEFAULT_GALLERY_CONFIG;
    }
  },

  getEventGalleries(): EventGallery[] {
    return this.getGalleries();
  },

  saveEventGalleries(galleries: EventGallery[]): void {
    this.saveGalleries(galleries);
  },

  getGalleries(): EventGallery[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GALLERIES);
      if (data) {
        const parsed: EventGallery[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load galleries', e);
    }
    this.saveGalleries(initialEventGalleries);
    return initialEventGalleries;
  },

  saveGalleries(galleries: EventGallery[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GALLERIES, JSON.stringify(galleries));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save galleries', e);
    }
  },

  saveGallery(gallery: Partial<EventGallery> & { title: string; coverImage: string; photos: string[] }): EventGallery {
    const galleries = this.getGalleries();
    const categories = this.getCategories();
    
    // Ensure Eventos category exists
    let eventCat = categories.find(c => c.slug === 'eventos' || c.name.toLowerCase().includes('evento'));
    if (!eventCat) {
      eventCat = this.saveCategory({
        name: 'Eventos & Galerias',
        slug: 'eventos',
        color: '#8b5cf6',
        showOnHome: true,
      });
    }

    let savedGallery: EventGallery;
    const galleryId = gallery.id || ('gal-' + Date.now());
    const showAsArticle = gallery.showAsArticle !== false;
    let articleId = gallery.articleId;

    // If marked to show as article, sync with articles collection
    if (showAsArticle) {
      const articleTitle = gallery.title.trim();
      const articleSubtitle = gallery.subtitle?.trim() || `Cobertura de fotos: ${gallery.location || 'Evento'} - ${gallery.eventDate || new Date().toLocaleDateString('pt-BR')}`;
      
      const syncedArticle = this.saveArticle({
        id: articleId || ('art-gal-' + galleryId),
        title: articleTitle,
        subtitle: articleSubtitle,
        content: `<p>${articleSubtitle}</p><p>Confira as fotos e os melhores registros da cobertura oficial do evento realizada em ${gallery.eventDate || 'data recente'}${gallery.location ? ` no ${gallery.location}` : ''}.</p>`,
        categoryId: eventCat.id,
        featuredImage: gallery.coverImage,
        additionalImages: gallery.photos || [],
        author: gallery.organizer?.trim() || 'Cobertura de Eventos',
        authorRole: 'Fotografia & Eventos',
        publishedAt: gallery.eventDate ? new Date(gallery.eventDate).toISOString() : new Date().toISOString(),
        status: 'published',
        isHighlight: false,
      });
      articleId = syncedArticle.id;
    }

    if (gallery.id) {
      const index = galleries.findIndex(g => g.id === gallery.id);
      if (index !== -1) {
        savedGallery = {
          ...galleries[index],
          ...gallery,
          showAsArticle,
          articleId,
        } as EventGallery;
        galleries[index] = savedGallery;
      } else {
        savedGallery = {
          id: galleryId,
          title: gallery.title.trim(),
          subtitle: gallery.subtitle?.trim() || '',
          eventDate: gallery.eventDate || new Date().toISOString().slice(0, 10),
          location: gallery.location?.trim() || '',
          organizer: gallery.organizer?.trim() || '',
          coverImage: gallery.coverImage,
          photos: gallery.photos || [],
          showAsArticle,
          articleId,
          views: gallery.views || 0,
          createdAt: gallery.createdAt || new Date().toISOString(),
        };
        galleries.unshift(savedGallery);
      }
    } else {
      savedGallery = {
        id: galleryId,
        title: gallery.title.trim(),
        subtitle: gallery.subtitle?.trim() || '',
        eventDate: gallery.eventDate || new Date().toISOString().slice(0, 10),
        location: gallery.location?.trim() || '',
        organizer: gallery.organizer?.trim() || '',
        coverImage: gallery.coverImage,
        photos: gallery.photos || [],
        showAsArticle,
        articleId,
        views: 0,
        createdAt: new Date().toISOString(),
      };
      galleries.unshift(savedGallery);
    }

    this.saveGalleries(galleries);
    return savedGallery;
  },

  deleteGallery(id: string): void {
    const gallery = this.getGalleries().find(g => g.id === id);
    if (gallery?.articleId) {
      this.deleteArticle(gallery.articleId);
    }
    const filtered = this.getGalleries().filter(g => g.id !== id);
    this.saveGalleries(filtered);
  },

  // Event Agenda (Agenda de Eventos)
  getEventAgenda(): EventAgendaItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGENDA);
      if (data) {
        const parsed: EventAgendaItem[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load event agenda', e);
    }
    this.saveEventAgenda(initialEventAgenda);
    return initialEventAgenda;
  },

  saveEventAgenda(items: EventAgendaItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(items));
      window.dispatchEvent(new Event('portal_data_updated'));
    } catch (e) {
      console.error('Failed to save event agenda', e);
    }
  },

  saveEventAgendaItem(item: Partial<EventAgendaItem> & { name: string; bannerUrl: string; date: string; contact: string; location: string }): EventAgendaItem {
    const items = this.getEventAgenda();
    let saved: EventAgendaItem;

    if (item.id) {
      const index = items.findIndex(i => i.id === item.id);
      if (index !== -1) {
        saved = {
          ...items[index],
          ...item,
        } as EventAgendaItem;
        items[index] = saved;
      } else {
        saved = {
          id: item.id,
          name: item.name.trim(),
          bannerUrl: item.bannerUrl.trim(),
          date: item.date,
          contact: item.contact.trim(),
          location: item.location.trim(),
          siteLink: item.siteLink?.trim() || '',
          description: item.description?.trim() || '',
          featured: item.featured ?? false,
          active: item.active !== false,
          createdAt: item.createdAt || new Date().toISOString(),
        };
        items.unshift(saved);
      }
    } else {
      saved = {
        id: 'agenda-' + Date.now(),
        name: item.name.trim(),
        bannerUrl: item.bannerUrl.trim(),
        date: item.date,
        contact: item.contact.trim(),
        location: item.location.trim(),
        siteLink: item.siteLink?.trim() || '',
        description: item.description?.trim() || '',
        featured: item.featured ?? false,
        active: item.active !== false,
        createdAt: new Date().toISOString(),
      };
      items.unshift(saved);
    }

    this.saveEventAgenda(items);
    return saved;
  },

  deleteEventAgendaItem(id: string): void {
    const filtered = this.getEventAgenda().filter(i => i.id !== id);
    this.saveEventAgenda(filtered);
  },

  // Reset to original demo content or reload from Supabase
  resetAllToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.ARTICLES);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.BANNERS);
    localStorage.removeItem('portal_deleted_article_ids');
    localStorage.removeItem('portal_deleted_category_ids');
    localStorage.removeItem('portal_deleted_banner_ids');
    this.saveCategories(DEFAULT_DATABASE_CATEGORIES);
    this.saveArticles([]);
    this.saveBanners([]);
    this.clearFacebookLogs();
    supabaseSyncService.fetchAndApplyAllFromSupabase().catch((err) => {
      console.warn('[Supabase] Falha ao recarregar dados do Supabase:', err);
    });
  }
};
