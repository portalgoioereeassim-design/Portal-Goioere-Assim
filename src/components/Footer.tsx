import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Twitter, 
  MessageCircle,
  ArrowUp,
  Store,
  X,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { Category, VisualIdentity, BusinessGuideConfig, FooterContentItem } from '../types';
import { Logo } from './Logo';

interface FooterProps {
  identity: VisualIdentity;
  categories: Category[];
  businessGuideConfig?: BusinessGuideConfig;
  onOpenBusinessGuide?: () => void;
  onSelectCategory: (categoryId: string) => void;
  onGoHome: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  identity,
  categories,
  businessGuideConfig,
  onOpenBusinessGuide,
  onSelectCategory,
  onGoHome,
  onOpenAdmin,
}) => {
  const [activeModalItem, setActiveModalItem] = useState<{ title: string; content: string } | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenInstitutional = (item?: FooterContentItem, fallbackTitle?: string, fallbackContent?: string) => {
    if (item?.url && item.url.startsWith('http')) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setActiveModalItem({
      title: item?.title || fallbackTitle || 'Institucional',
      content: item?.content || fallbackContent || 'Informações institucionais em atualização.',
    });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="w-full text-slate-400 text-sm border-t border-slate-800 mt-16 transition-colors"
      style={{ backgroundColor: identity.colors?.footerBg || '#020617' }}
    >
      {/* Top Footer Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Col 1 & 2: Brand, Description, Social Media */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" onClick={onGoHome} className="cursor-pointer inline-block">
              <Logo identity={identity} variant="mono" size="md" />
            </Link>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md">
              {identity.description || 'Jornalismo sério, independente e em tempo real. Informação com qualidade, ética e compromisso com o leitor brasileiro.'}
            </p>

            {/* Social Media Links (Apenas as selecionadas e preenchidas ativas) */}
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              {identity.socialMedia?.instagramEnabled !== false && !!identity.socialMedia?.instagram?.trim() && (
                <a
                  href={identity.socialMedia.instagram.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Siga-nos no Instagram"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-red-600 hover:to-purple-600 hover:text-white flex items-center justify-center transition-all text-slate-300 shadow-2xs hover:scale-105"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {identity.socialMedia?.facebookEnabled !== false && !!identity.socialMedia?.facebook?.trim() && (
                <a
                  href={identity.socialMedia.facebook.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Acompanhe nossa página no Facebook"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all text-slate-300 shadow-2xs hover:scale-105"
                >
                  <Facebook className="w-4 h-4 fill-current" />
                </a>
              )}
              {identity.socialMedia?.whatsappEnabled !== false && !!identity.socialMedia?.whatsapp?.trim() && (
                <a
                  href={identity.socialMedia.whatsapp.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp Canal"
                  title="Participe do nosso canal no WhatsApp"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all text-slate-300 shadow-2xs hover:scale-105"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {identity.socialMedia?.twitterEnabled !== false && !!identity.socialMedia?.twitter?.trim() && (
                <a
                  href={identity.socialMedia.twitter.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  title="Acompanhe no Twitter / X"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-all text-slate-300 shadow-2xs hover:scale-105"
                >
                  <Twitter className="w-4 h-4 fill-current" />
                </a>
              )}
            </div>
          </div>

          {/* Col 3: Categorias Principais */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Categorias
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/noticias"
                  onClick={() => onSelectCategory('cat-ultimas')}
                  className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-left inline-flex"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Últimas Notícias
                </Link>
              </li>
              {businessGuideConfig?.enabled !== false && (
                <li>
                  <Link
                    to="/guia-empresarial"
                    onClick={onOpenBusinessGuide}
                    className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-left text-emerald-400 inline-flex"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>{businessGuideConfig?.tabName || 'Guia Empresarial'}</span>
                  </Link>
                </li>
              )}
              {[...categories]
                .filter(c => !c.hideInMenu)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/noticias/${cat.slug || cat.id}`}
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-white transition-colors cursor-pointer text-left inline-block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Institucional & Editorial */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Institucional
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenInstitutional(
                    identity.footerLinks?.quemSomos,
                    'Quem Somos',
                    'O Portal de Notícias é um veículo de comunicação independente, dedicado à cobertura séria, imparcial e em tempo real dos acontecimentos que impactam nossa cidade, estado e país.'
                  )}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {identity.footerLinks?.quemSomos?.title || 'Quem Somos'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenInstitutional(
                    identity.footerLinks?.principiosEditoriais,
                    'Princípios Editoriais',
                    'Nosso compromisso inegociável é com a verdade factual, a checagem rigorosa de informações, a pluralidade de visões e a ética jornalística irrestrita.'
                  )}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {identity.footerLinks?.principiosEditoriais?.title || 'Princípios Editoriais'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenInstitutional(
                    identity.footerLinks?.termosPrivacidade,
                    'Termos de Uso & Privacidade',
                    'Respeitamos a privacidade de nossos leitores e garantimos a proteção de dados em conformidade com a Lei Geral de Proteção de Dados (LGPD). Seus dados não são comercializados.'
                  )}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {identity.footerLinks?.termosPrivacidade?.title || 'Termos de Uso & Privacidade'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenInstitutional(
                    identity.footerLinks?.anuncieConosco,
                    'Anuncie Conosco',
                    'Divulgue sua marca e seus produtos para milhares de leitores diários com formatos inovadores de banners, publieditoriais e minisites comerciais. Fale com nossa equipe comercial.'
                  )}
                  className="hover:text-white transition-colors cursor-pointer text-left block"
                >
                  {identity.footerLinks?.anuncieConosco?.title || 'Anuncie Conosco'}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 5: Informações de Contato */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Contato & Redação
            </h3>
            <ul className="space-y-3 text-xs">
              {identity.contactEmail && (
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="break-all">{identity.contactEmail}</span>
                </li>
              )}
              {identity.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{identity.contactPhone}</span>
                </li>
              )}
              {identity.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{identity.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer: Copyright, Creator Credit (BomTempo Produções), Discreet ADM Button, Back to Top */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <p>© {currentYear} {identity.siteName}. Todos os direitos reservados.</p>
          </div>

          {/* Criador do Site (BomTempo Produções) */}
          {identity.creatorCredit?.enabled !== false && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Desenvolvido por:</span>
              <a
                href={identity.creatorCredit?.url || 'https://bomtempoproducoes.com.br'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-200 hover:text-white underline decoration-slate-600 hover:decoration-white transition-colors"
              >
                {identity.creatorCredit?.text || 'BomTempo Produções'}
              </a>
            </div>
          )}

          <div className="flex items-center gap-4">
            {/* Small, discreet minimalist "Painel ADM" button */}
            <Link
              to="/adm"
              aria-label="Acessar Painel Administrativo"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-normal text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 rounded transition-colors border border-slate-800 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Painel ADM</span>
            </Link>

            {/* Back to top */}
            <button
              onClick={scrollToTop}
              aria-label="Voltar ao topo"
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Modal for Footer Links */}
      {activeModalItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveModalItem(null)}
        >
          <div 
            className="bg-white text-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {activeModalItem.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-line pr-1">
              {activeModalItem.content}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
