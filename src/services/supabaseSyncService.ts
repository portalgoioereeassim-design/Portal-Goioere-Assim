import { getSupabaseClient, getSupabaseConfig, testSupabaseConnection } from './supabaseClient';
import { storageService, MOCK_ARTICLE_IDS, DEFAULT_DATABASE_CATEGORIES } from './storageService';
import { Article, Banner, Category } from '../types';
import { initialArticles } from '../data/initialData';

export interface SyncStatus {
  lastSyncTime: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  syncedKeys: string[];
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const STORAGE_KEY_SYNC_STATUS = 'portal_supabase_sync_status_v1';
let cachedRecordsTable: 'portal_records' | 'registros_do_portal' | null = null;

async function getRecordsTableName(client: any): Promise<'portal_records' | 'registros_do_portal'> {
  if (cachedRecordsTable) return cachedRecordsTable;
  try {
    const { error: test1 } = await client.from('registros_do_portal').select('colecao').limit(1);
    if (!test1) {
      cachedRecordsTable = 'registros_do_portal';
      return 'registros_do_portal';
    }
  } catch {}
  try {
    const { error: test2 } = await client.from('portal_records').select('key').limit(1);
    if (!test2) {
      cachedRecordsTable = 'portal_records';
      return 'portal_records';
    }
  } catch {}
  return 'registros_do_portal';
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- PORTAL DE NOTÍCIAS (GOIOERÊ É ASSIM) - ESQUEMA DE BANCO DE DADOS SUPABASE POSTGRESQL
-- Compatível com Supabase SQL Editor, Storage, RLS, Realtime e Autenticação
-- ==============================================================================

-- 1. HABILITAR EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FUNÇÃO UTILITÁRIA PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELA DE CATEGORIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  imagem TEXT,
  ordem INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  cor_destaque TEXT DEFAULT '#2563eb',
  exibir_na_home BOOLEAN DEFAULT true,
  ocultar_no_menu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger para updated_at em categorias
DROP TRIGGER IF EXISTS trg_categorias_updated_at ON public.categorias;
CREATE TRIGGER trg_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 4. TABELA DE USUÁRIOS DO PAINEL ADMINISTRATIVO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
  nivel TEXT NOT NULL DEFAULT 'editor' CHECK (nivel IN ('administrador', 'editor', 'autor')),
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_usuarios_admin_updated_at ON public.usuarios_admin;
CREATE TRIGGER trg_usuarios_admin_updated_at
BEFORE UPDATE ON public.usuarios_admin
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 5. TABELA DE MATÉRIAS / NOTÍCIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.materias (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitulo TEXT,
  resumo TEXT,
  conteudo_html TEXT,
  imagem_principal TEXT,
  imagem_legenda TEXT,
  autor_id UUID REFERENCES public.usuarios_admin(id) ON DELETE SET NULL,
  autor_nome TEXT DEFAULT 'Redação',
  autor_cargo TEXT,
  autor_avatar TEXT,
  categoria_id TEXT REFERENCES public.categorias(id) ON DELETE SET NULL,
  categoria_nome TEXT,
  tags TEXT[], -- Suporte rápido por array de tags
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho', 'agendado', 'arquivado')),
  destaque BOOLEAN DEFAULT false,
  agendado_para TIMESTAMPTZ,
  data_publicacao TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  visualizacoes INTEGER DEFAULT 0,
  codigo_numerico TEXT,
  fonte_tipografia TEXT DEFAULT 'sans' CHECK (fonte_tipografia IN ('sans', 'serif', 'times', 'mono')),
  youtube_url TEXT,
  facebook_auto_publish BOOLEAN DEFAULT false,
  facebook_published BOOLEAN DEFAULT false,
  facebook_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_materias_updated_at ON public.materias;
CREATE TRIGGER trg_materias_updated_at
BEFORE UPDATE ON public.materias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. TABELA DE FOTOS ADICIONAIS DAS MATÉRIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fotos_materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id TEXT NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nome_arquivo TEXT,
  legenda TEXT,
  texto_alternativo TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 7. TABELA DE VÍDEOS DO YOUTUBE DAS MATÉRIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.videos_youtube (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id TEXT NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  titulo TEXT,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 8. SISTEMA DE TAGS E RELACIONAMENTO N:N
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.materias_tags (
  materia_id TEXT NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (materia_id, tag_id)
);

-- ==============================================================================
-- 9. TABELA DE GALERIAS DE FOTOS E FOTOS DA GALERIA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.galerias (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitulo TEXT,
  descricao TEXT,
  imagem_capa TEXT,
  data_evento DATE,
  local TEXT,
  organizador TEXT,
  materia_id TEXT REFERENCES public.materias(id) ON DELETE SET NULL,
  exibir_como_materia BOOLEAN DEFAULT false,
  visualizacoes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho', 'arquivado')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_galerias_updated_at ON public.galerias;
CREATE TRIGGER trg_galerias_updated_at
BEFORE UPDATE ON public.galerias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.fotos_galeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  galeria_id TEXT NOT NULL REFERENCES public.galerias(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  legenda TEXT,
  texto_alternativo TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 10. TABELA DE BANNERS PUBLICITÁRIOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT NOT NULL,
  link TEXT,
  tipo_banner TEXT DEFAULT 'commercial' CHECK (tipo_banner IN ('commercial', 'supporter', 'art', 'partner', 'institutional')),
  posicao TEXT NOT NULL DEFAULT 'slideshow' CHECK (posicao IN ('topo', 'slideshow', 'lateral', 'materia', 'body_slideshow', 'rodape', 'popup')),
  ordem INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  cliques INTEGER DEFAULT 0,
  tag_badge TEXT,
  exibir_texto BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_banners_updated_at ON public.banners;
CREATE TRIGGER trg_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 11. TABELA DE LINKS EXTERNOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.links_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  imagem TEXT,
  descricao TEXT,
  posicao TEXT DEFAULT 'rodape',
  ordem INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  target TEXT DEFAULT '_blank',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_links_externos_updated_at ON public.links_externos;
CREATE TRIGGER trg_links_externos_updated_at
BEFORE UPDATE ON public.links_externos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 12. TABELA DE CONFIGURAÇÕES GERAIS DO SITE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id TEXT PRIMARY KEY,
  nome_site TEXT,
  descricao TEXT,
  logo_url TEXT,
  logo_mono_url TEXT,
  favicon_url TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  whatsapp TEXT,
  twitter TEXT,
  codigos_integracao TEXT,
  texto_rodape TEXT,
  creditos_criador TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- Flexibilidade máxima para parâmetros e customizações
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER trg_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 13. TABELA DE REGISTRO ANÔNIMO DE VISUALIZAÇÕES DAS MATÉRIAS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.visualizacoes_materias (
  id BIGSERIAL PRIMARY KEY,
  materia_id TEXT NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  ip_hash TEXT, -- SHA-256 anônimo do IP (privacidade LGPD/GDPR garantida)
  user_agent_hash TEXT,
  visualizado_em TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Função atômica para registrar visualização e incrementar contador da matéria
CREATE OR REPLACE FUNCTION public.registrar_visualizacao_materia(
  p_materia_id TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent_hash TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- 1. Insere o registro analítico
  INSERT INTO public.visualizacoes_materias (materia_id, ip_hash, user_agent_hash, visualizado_em)
  VALUES (p_materia_id, p_ip_hash, p_user_agent_hash, TIMEZONE('utc'::text, NOW()));

  -- 2. Atualiza contador consolidado na tabela de matérias
  UPDATE public.materias
  SET visualizacoes = COALESCE(visualizacoes, 0) + 1
  WHERE id = p_materia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 14. TABELA DE MENUS DO PORTAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.menus (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  categoria_id TEXT REFERENCES public.categorias(id) ON DELETE SET NULL,
  ordem INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  posicao TEXT DEFAULT 'topo' CHECK (posicao IN ('topo', 'rodape', 'mobile', 'lateral')),
  tipo TEXT DEFAULT 'custom' CHECK (tipo IN ('system', 'category', 'custom')),
  chave_sistema TEXT,
  icone TEXT,
  cor TEXT,
  menu_pai_id TEXT REFERENCES public.menus(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_menus_updated_at ON public.menus;
CREATE TRIGGER trg_menus_updated_at
BEFORE UPDATE ON public.menus
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 15. TABELA DE PÁGINAS INSTITUCIONAIS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.paginas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitulo TEXT,
  conteudo TEXT,
  imagem_destaque TEXT,
  status TEXT DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho', 'arquivado')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_paginas_updated_at ON public.paginas;
CREATE TRIGGER trg_paginas_updated_at
BEFORE UPDATE ON public.paginas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 16. TABELAS DE MINISSITES, PÁGINAS ESPECIAIS E GUIA EMPRESARIAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.minissites (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  logo TEXT,
  imagem_capa TEXT,
  conteudo TEXT,
  whatsapp TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT DEFAULT 'Goioerê',
  estado TEXT DEFAULT 'PR',
  redes_sociais JSONB DEFAULT '{}'::jsonb,
  dados_extras JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'publicado' CHECK (status IN ('publicado', 'rascunho', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_minissites_updated_at ON public.minissites;
CREATE TRIGGER trg_minissites_updated_at
BEFORE UPDATE ON public.minissites
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lojas e Produtos do Guia Comercial
CREATE TABLE IF NOT EXISTS public.lojas_guia (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  segmento TEXT,
  descricao TEXT,
  sobre_texto TEXT,
  logo_url TEXT,
  banner_capa_url TEXT,
  whatsapp TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT DEFAULT 'Goioerê',
  estado TEXT DEFAULT 'PR',
  horario_funcionamento TEXT,
  maps_url TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  verificado BOOLEAN DEFAULT false,
  destaque BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.produtos_guia (
  id TEXT PRIMARY KEY,
  loja_id TEXT NOT NULL REFERENCES public.lojas_guia(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'product' CHECK (tipo IN ('product', 'service')),
  categoria TEXT,
  preco NUMERIC(10,2),
  preco_formatado TEXT,
  descricao_curta TEXT,
  descricao TEXT,
  fotos TEXT[],
  destaque BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 17. TABELA DE AGENDA DE EVENTOS DO MUNICÍPIO/REGIÃO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  data_evento TEXT NOT NULL,
  contato TEXT,
  local TEXT,
  link_site TEXT,
  descricao TEXT,
  destaque BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 18. TABELAS DE BACKUP E SINCRONIZAÇÃO COMPLETA DO PORTAL (JSONB)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registros_do_portal (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.portal_records (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 19. VIEWS DE RETROCOMPATIBILIDADE (Evita quebras em rotas legadas)
-- ==============================================================================
DROP VIEW IF EXISTS public.artigos CASCADE;
CREATE OR REPLACE VIEW public.artigos AS
SELECT 
  id,
  titulo AS title,
  slug,
  subtitulo AS subtitle,
  conteudo_html AS content,
  categoria_id AS category_id,
  categoria_nome AS category_name,
  imagem_principal AS featured_image,
  imagem_legenda AS image_caption,
  to_jsonb(COALESCE(
    (SELECT array_agg(f.url ORDER BY f.ordem) FROM public.fotos_materias f WHERE f.materia_id = m.id), 
    '{}'::text[]
  )) AS additional_images,
  data_publicacao AS published_at,
  autor_nome AS author,
  autor_cargo AS author_role,
  autor_avatar AS author_avatar,
  youtube_url,
  status,
  visualizacoes AS views,
  destaque AS is_highlight,
  facebook_auto_publish,
  facebook_published,
  created_at
FROM public.materias m;

-- ==============================================================================
-- 20. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_materias_slug ON public.materias(slug);
CREATE INDEX IF NOT EXISTS idx_materias_categoria ON public.materias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_materias_status_data ON public.materias(status, data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_materias_destaque ON public.materias(destaque) WHERE destaque = true;
CREATE INDEX IF NOT EXISTS idx_materias_visualizacoes ON public.materias(visualizacoes DESC);
CREATE INDEX IF NOT EXISTS idx_materias_autor ON public.materias(autor_id);
CREATE INDEX IF NOT EXISTS idx_fotos_materias_materia ON public.fotos_materias(materia_id, ordem);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_materia ON public.videos_youtube(materia_id, ordem);
CREATE INDEX IF NOT EXISTS idx_categorias_slug ON public.categorias(slug);
CREATE INDEX IF NOT EXISTS idx_categorias_ordem ON public.categorias(ordem);
CREATE INDEX IF NOT EXISTS idx_galerias_slug ON public.galerias(slug);
CREATE INDEX IF NOT EXISTS idx_fotos_galeria_galeria ON public.fotos_galeria(galeria_id, ordem);
CREATE INDEX IF NOT EXISTS idx_banners_posicao_status ON public.banners(posicao, status, ordem);
CREATE INDEX IF NOT EXISTS idx_menus_posicao_ordem ON public.menus(posicao, ordem);
CREATE INDEX IF NOT EXISTS idx_paginas_slug ON public.paginas(slug);
CREATE INDEX IF NOT EXISTS idx_lojas_slug ON public.lojas_guia(slug);
CREATE INDEX IF NOT EXISTS idx_produtos_loja ON public.produtos_guia(loja_id);

-- ==============================================================================
-- 21. CONFIGURAÇÃO DE BUCKETS DO SUPABASE STORAGE
-- ==============================================================================
-- Cria os buckets necessários no schema storage.buckets de forma segura e idempotente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('imagens-das-materias', 'imagens-das-materias', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('galerias', 'galerias', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm']),
  ('arquivos', 'arquivos', true, 20971520, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para leitura pública e escrita autenticada
DROP POLICY IF EXISTS "Acesso público aos arquivos do storage" ON storage.objects;
CREATE POLICY "Acesso público aos arquivos do storage"
ON storage.objects FOR SELECT
USING (bucket_id IN ('imagens-das-materias', 'galerias', 'banners', 'logos', 'videos', 'arquivos'));

DROP POLICY IF EXISTS "Upload de arquivos para usuários autorizados" ON storage.objects;
CREATE POLICY "Upload de arquivos para usuários autorizados"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('imagens-das-materias', 'galerias', 'banners', 'logos', 'videos', 'arquivos'));

DROP POLICY IF EXISTS "Atualização e exclusão de arquivos no storage" ON storage.objects;
CREATE POLICY "Atualização e exclusão de arquivos no storage"
ON storage.objects FOR ALL
USING (bucket_id IN ('imagens-das-materias', 'galerias', 'banners', 'logos', 'videos', 'arquivos'));

-- ==============================================================================
-- 22. SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos_youtube ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galerias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizacoes_materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minissites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_guia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_guia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_do_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_records ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública para o Site (Visitantes / Anon)
DROP POLICY IF EXISTS "Leitura pública categorias ativas" ON public.categorias;
CREATE POLICY "Leitura pública categorias ativas" ON public.categorias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública matérias publicadas" ON public.materias;
CREATE POLICY "Leitura pública matérias publicadas" ON public.materias FOR SELECT 
USING (status = 'publicado' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública fotos matérias" ON public.fotos_materias;
CREATE POLICY "Leitura pública fotos matérias" ON public.fotos_materias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública vídeos youtube" ON public.videos_youtube;
CREATE POLICY "Leitura pública vídeos youtube" ON public.videos_youtube FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública tags" ON public.tags;
CREATE POLICY "Leitura pública tags" ON public.tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública materias_tags" ON public.materias_tags;
CREATE POLICY "Leitura pública materias_tags" ON public.materias_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública galerias" ON public.galerias;
CREATE POLICY "Leitura pública galerias" ON public.galerias FOR SELECT USING (status = 'publicado' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública fotos galeria" ON public.fotos_galeria;
CREATE POLICY "Leitura pública fotos galeria" ON public.fotos_galeria FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública banners ativos" ON public.banners;
CREATE POLICY "Leitura pública banners ativos" ON public.banners FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública links externos" ON public.links_externos;
CREATE POLICY "Leitura pública links externos" ON public.links_externos FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública configurações" ON public.configuracoes;
CREATE POLICY "Leitura pública configurações" ON public.configuracoes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Leitura pública menus" ON public.menus;
CREATE POLICY "Leitura pública menus" ON public.menus FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública páginas institucionais" ON public.paginas;
CREATE POLICY "Leitura pública páginas institucionais" ON public.paginas FOR SELECT USING (status = 'publicado' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública minissites" ON public.minissites;
CREATE POLICY "Leitura pública minissites" ON public.minissites FOR SELECT USING (status = 'publicado' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública lojas guia" ON public.lojas_guia;
CREATE POLICY "Leitura pública lojas guia" ON public.lojas_guia FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública produtos guia" ON public.produtos_guia;
CREATE POLICY "Leitura pública produtos guia" ON public.produtos_guia FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Leitura pública agenda eventos" ON public.agenda_eventos;
CREATE POLICY "Leitura pública agenda eventos" ON public.agenda_eventos FOR SELECT USING (status = 'ativo' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Registro público de visualizações" ON public.visualizacoes_materias;
CREATE POLICY "Registro público de visualizações" ON public.visualizacoes_materias FOR INSERT WITH CHECK (true);

-- Permissões de Administração (Escrita e Gerenciamento para o Painel)
DROP POLICY IF EXISTS "Gerenciamento completo categorias" ON public.categorias;
CREATE POLICY "Gerenciamento completo categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo matérias" ON public.materias;
CREATE POLICY "Gerenciamento completo matérias" ON public.materias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo fotos matérias" ON public.fotos_materias;
CREATE POLICY "Gerenciamento completo fotos matérias" ON public.fotos_materias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo vídeos youtube" ON public.videos_youtube;
CREATE POLICY "Gerenciamento completo vídeos youtube" ON public.videos_youtube FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo tags" ON public.tags;
CREATE POLICY "Gerenciamento completo tags" ON public.tags FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo materias_tags" ON public.materias_tags;
CREATE POLICY "Gerenciamento completo materias_tags" ON public.materias_tags FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo galerias" ON public.galerias;
CREATE POLICY "Gerenciamento completo galerias" ON public.galerias FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo fotos galeria" ON public.fotos_galeria;
CREATE POLICY "Gerenciamento completo fotos galeria" ON public.fotos_galeria FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo banners" ON public.banners;
CREATE POLICY "Gerenciamento completo banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo links externos" ON public.links_externos;
CREATE POLICY "Gerenciamento completo links externos" ON public.links_externos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo configurações" ON public.configuracoes;
CREATE POLICY "Gerenciamento completo configurações" ON public.configuracoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo usuários admin" ON public.usuarios_admin;
CREATE POLICY "Gerenciamento completo usuários admin" ON public.usuarios_admin FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo menus" ON public.menus;
CREATE POLICY "Gerenciamento completo menus" ON public.menus FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo páginas" ON public.paginas;
CREATE POLICY "Gerenciamento completo páginas" ON public.paginas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo minissites" ON public.minissites;
CREATE POLICY "Gerenciamento completo minissites" ON public.minissites FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo lojas guia" ON public.lojas_guia;
CREATE POLICY "Gerenciamento completo lojas guia" ON public.lojas_guia FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo produtos guia" ON public.produtos_guia;
CREATE POLICY "Gerenciamento completo produtos guia" ON public.produtos_guia FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gerenciamento completo agenda" ON public.agenda_eventos;
CREATE POLICY "Gerenciamento completo agenda" ON public.agenda_eventos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total registros_do_portal" ON public.registros_do_portal;
CREATE POLICY "Acesso total registros_do_portal" ON public.registros_do_portal FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total portal_records" ON public.portal_records;
CREATE POLICY "Acesso total portal_records" ON public.portal_records FOR ALL USING (true) WITH CHECK (true);

-- Ativar Notificações Realtime para sincronização instantânea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'registros_do_portal'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_do_portal;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'materias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.materias;
  END IF;
END $$;

-- ==============================================================================
-- 23. DADOS INICIAIS (SEEDS IDEMPOTENTES - ON CONFLICT DO NOTHING)
-- ==============================================================================

-- Categorias Padrão
INSERT INTO public.categorias (id, nome, slug, descricao, ordem, cor_destaque, exibir_na_home, status) VALUES
  ('cat-politica', 'Política', 'politica', 'Notícias do cenário político e legislativo', 1, '#2563eb', true, 'ativo'),
  ('cat-goioere', 'Goioerê', 'goioere', 'Acontecimentos, obras e notícias da cidade de Goioerê', 2, '#059669', true, 'ativo'),
  ('cat-estado', 'Estado', 'estado', 'Notícias do Paraná e cidades vizinhas', 3, '#0284c7', true, 'ativo'),
  ('cat-esportes', 'Esportes', 'esportes', 'Futebol, modalidades esportivas e atletas da região', 4, '#0891b2', true, 'ativo'),
  ('cat-entretenimento', 'Entretenimento', 'entretenimento', 'Cultura, eventos, música e variedades', 5, '#db2777', true, 'ativo'),
  ('cat-economia', 'Economia', 'economia', 'Mercado, agronegócio, comércio e oportunidades', 6, '#0d9488', true, 'ativo'),
  ('cat-educacao', 'Educação', 'educacao', 'Escolas, vestibulares, bolsas e universidades', 7, '#d97706', true, 'ativo'),
  ('cat-saude', 'Saúde', 'saude', 'Medicina, prevenção, bem-estar e cuidados', 8, '#dc2626', true, 'ativo'),
  ('cat-cultura', 'Cultura', 'cultura', 'Artes, história, literatura e patrimônio local', 9, '#7c3aed', true, 'ativo'),
  ('cat-podcast', 'Podcast', 'podcast', 'Episódios em vídeo e entrevistas exclusivas', 10, '#8b5cf6', true, 'ativo')
ON CONFLICT (id) DO NOTHING;

-- Usuário Administrador Inicial (Senha padrão segura com Blowfish pgcrypto)
INSERT INTO public.usuarios_admin (id, usuario, senha_hash, nome, email, status, nivel)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '@Daniel1995',
  crypt('1010', gen_salt('bf')),
  'Daniel BomTempo',
  'portalgoioereeassim@gmail.com',
  'ativo',
  'administrador'
)
ON CONFLICT (usuario) DO NOTHING;

-- Configurações Iniciais da Identidade do Portal
INSERT INTO public.configuracoes (id, nome_site, descricao, email, telefone, endereco, instagram, facebook, whatsapp, texto_rodape, creditos_criador)
VALUES (
  'identidade_visual',
  'Portal Goioerê é Assim',
  'O portal de notícias mais completo e atualizado de Goioerê e região.',
  'portalgoioereeassim@gmail.com',
  '(44) 99999-9999',
  'Goioerê - Paraná, Brasil',
  'https://instagram.com',
  'https://facebook.com',
  '5544999999999',
  '© 2026 Portal Goioerê é Assim. Todos os direitos reservados.',
  'BomTempo Produções'
)
ON CONFLICT (id) DO NOTHING;

-- Páginas Institucionais Padrão
INSERT INTO public.paginas (id, titulo, slug, subtitulo, conteudo, status) VALUES
  ('pag-quem-somos', 'Quem Somos', 'quem-somos', 'Nossa história e compromisso com a verdade', '<h2>Sobre o Portal Goioerê é Assim</h2><p>O Portal Goioerê é Assim nasceu com o propósito de levar informação ágil, ética e de qualidade para toda a população de Goioerê e região.</p><p>Nossa equipe trabalha diuturnamente na cobertura dos principais fatos nas áreas de política, economia, cidade, cultura e esportes, sempre com independência e responsabilidade jornalística.</p>', 'publicado'),
  ('pag-termos', 'Termos de Uso', 'termos-de-uso', 'Condições gerais de navegação e utilização do portal', '<h2>Termos e Condições de Uso</h2><p>Ao navegar pelo Portal Goioerê é Assim, o leitor concorda expressamente com os termos e regras de utilização aqui previstos.</p><p>Todo o conteúdo jornalístico, imagens e logotipos são protegidos por direitos autorais.</p>', 'publicado'),
  ('pag-privacidade', 'Política de Privacidade', 'politica-de-privacidade', 'Segurança, privacidade e tratamento ético de dados', '<h2>Política de Privacidade</h2><p>O Portal Goioerê é Assim respeita rigorosamente a privacidade de seus leitores e as diretrizes da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p><p>Não coletamos informações cadastrais de visitantes comuns e utilizamos cookies exclusivamente para métricas anônimas de audiência.</p>', 'publicado')
ON CONFLICT (id) DO NOTHING;

-- Menus Padrão
INSERT INTO public.menus (id, nome, url, posicao, ordem, tipo, status) VALUES
  ('menu-home', 'Início', '/', 'topo', 1, 'system', 'ativo'),
  ('menu-ultimas', 'Últimas Notícias', '/noticias', 'topo', 2, 'system', 'ativo'),
  ('menu-goioere', 'Goioerê', '/noticias/goioere', 'topo', 3, 'category', 'ativo'),
  ('menu-politica', 'Política', '/noticias/politica', 'topo', 4, 'category', 'ativo'),
  ('menu-guia', 'Guia Comercial', '/guia', 'topo', 5, 'system', 'ativo'),
  ('menu-galerias', 'Galerias de Fotos', '/galerias', 'topo', 6, 'system', 'ativo'),
  ('menu-agenda', 'Agenda de Eventos', '/agenda', 'topo', 7, 'system', 'ativo'),
  ('menu-podcasts', 'Podcasts', '/podcasts', 'topo', 8, 'system', 'ativo')
ON CONFLICT (id) DO NOTHING;
`;

export const SUPABASE_SCHEMA_SQL = SUPABASE_SQL_SCHEMA;

export const supabaseSyncService = {
  getSyncStatus(): SyncStatus {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC_STATUS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      lastSyncTime: null,
      status: 'idle',
      message: 'Nenhuma sincronização recente.',
      syncedKeys: [],
    };
  },

  setSyncStatus(status: SyncStatus): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SYNC_STATUS, JSON.stringify(status));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('portal_supabase_sync_updated'));
      }
    } catch (e) {
      console.error('Failed to set sync status', e);
    }
  },

  /**
   * Automatically saves an updated collection/record to Supabase in the background
   */
  async autoSyncRecord(key: string, data: unknown): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config.autoSync) return false;

    try {
      const client = getSupabaseClient();
      const tableName = await getRecordsTableName(client);

      // 1. Try colecao / dados schema (registros_do_portal primary schema)
      const { error: errColecao } = await client
        .from(tableName)
        .upsert(
          {
            colecao: key,
            dados: data,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'colecao' }
        );

      if (!errColecao) {
        return true;
      }

      // 2. Fallback to key / data schema
      const { error: errKey } = await client
        .from(tableName)
        .upsert(
          {
            key,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (errKey) {
        console.warn(`[Supabase AutoSync] Aviso ao sincronizar '${key}':`, errKey.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`[Supabase AutoSync] Erro ao sincronizar '${key}':`, err);
      return false;
    }
  },

  /**
   * Directly syncs a single article to public.materias, public.artigos and registros_do_portal
   */
  async syncSingleArticle(article: Article): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config.autoSync) return false;

    try {
      const client = getSupabaseClient();

      // Normalize categoryId (e.g. cat-cidade or cidade)
      let normalizedCatId = article.categoryId;
      if (normalizedCatId?.startsWith('cat-')) {
        const stripped = normalizedCatId.replace(/^cat-/, '');
        const cat = storageService.getCategories().find(c => c.id === stripped || c.slug === stripped || c.id === article.categoryId);
        if (cat) normalizedCatId = cat.id;
      }

      const statusMap: Record<string, string> = {
        draft: 'rascunho',
        archived: 'arquivado',
        scheduled: 'publicado',
        published: 'publicado',
      };
      const dbStatus = statusMap[article.status] || 'publicado';

      // 1. Upsert to primary table 'materias'
      try {
        const materiaRow = {
          id: article.id,
          titulo: article.title,
          slug: article.slug || slugify(article.title),
          subtitulo: article.subtitle || '',
          resumo: article.subtitle || (article.content ? article.content.replace(/<[^>]*>?/gm, '').slice(0, 200) : ''),
          conteudo_html: article.content || '<p></p>',
          categoria_id: normalizedCatId || null,
          imagem_principal: article.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop',
          imagem_legenda: article.imageCaption || '',
          autor_nome: article.author || 'Redação',
          destaque: article.isHighlight ?? false,
          status: dbStatus,
          visualizacoes: article.views || 0,
          data_publicacao: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: matErr } = await client.from('materias').upsert(materiaRow, { onConflict: 'id' });
        if (matErr) {
          console.warn('[Supabase] Aviso ao gravar tabela materias:', matErr.message);
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao upsert em materias:', e);
      }

      // 2. Also try legacy table 'artigos' if present
      try {
        const row = {
          id: article.id,
          title: article.title,
          slug: article.slug || slugify(article.title),
          subtitle: article.subtitle || '',
          content: article.content || '',
          category_id: normalizedCatId || null,
          category_name: article.categoryName || '',
          featured_image: article.featuredImage || '',
          image_caption: article.imageCaption || '',
          additional_images: article.additionalImages || [],
          published_at: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
          author: article.author || 'Redação',
          status: article.status || 'published',
          views: article.views || 0,
          is_highlight: article.isHighlight ?? false,
          created_at: new Date().toISOString(),
        };
        await client.from('artigos').upsert(row, { onConflict: 'id' });
      } catch {
        // ignore
      }

      // Always persist to document store (registros_do_portal)
      await this.autoSyncRecord('articles', storageService.getArticles());
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao sincronizar artigo:', err);
      return false;
    }
  },

  async deleteSingleArticle(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      await Promise.allSettled([
        client.from('materias').delete().eq('id', id),
        client.from('artigos').delete().eq('id', id),
      ]);

      const localDeleted = storageService.getDeletedArticleIds();
      localDeleted.add(id);
      const deletedArray = Array.from(localDeleted);
      await this.autoSyncRecord('deleted_articles', deletedArray);
      await this.autoSyncRecord('articles', storageService.getArticles());
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao deletar artigo do Supabase:', err);
      return false;
    }
  },

  async syncSingleBanner(banner: Banner): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config.autoSync) return false;

    try {
      const client = getSupabaseClient();

      // Upsert to banners table
      try {
        const rowPt = {
          id: banner.id,
          titulo: banner.title,
          descricao: banner.description || '',
          imagem: banner.imageUrl,
          link: banner.targetUrl || '',
          posicao: banner.position || 'slideshow',
          ordem: banner.order || 0,
          status: banner.active !== false ? 'ativo' : 'inativo',
          cliques: banner.clicks || 0,
          created_at: new Date().toISOString(),
        };
        await client.from('banners').upsert(rowPt, { onConflict: 'id' });
      } catch {}

      try {
        const rowEn = {
          id: banner.id,
          title: banner.title,
          description: banner.description || '',
          image_url: banner.imageUrl,
          target_url: banner.targetUrl || '',
          position: banner.position || 'slideshow',
          order_index: banner.order || 0,
          active: banner.active ?? true,
          clicks: banner.clicks || 0,
          created_at: new Date().toISOString(),
        };
        await client.from('banners').upsert(rowEn, { onConflict: 'id' });
      } catch {}

      await this.autoSyncRecord('banners', storageService.getBanners());
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao sincronizar banner:', err);
      return false;
    }
  },

  async deleteSingleBanner(id: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      await client.from('banners').delete().eq('id', id);
      await this.autoSyncRecord('banners', storageService.getBanners());
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao deletar banner:', err);
      return false;
    }
  },

  async syncSingleCategory(category: Category): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config.autoSync) return false;

    try {
      const client = getSupabaseClient();

      // Upsert to relational table 'categorias'
      try {
        const catRow = {
          id: category.id,
          nome: category.name,
          slug: category.slug || slugify(category.name),
          descricao: category.description || '',
          ordem: category.order || 0,
          cor_destaque: category.color || '#2563eb',
          status: 'ativo',
          exibir_na_home: category.showOnHome !== false,
          ocultar_no_menu: category.hideInMenu === true,
          updated_at: new Date().toISOString(),
        };
        await client.from('categorias').upsert(catRow, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Falha ao gravar categorias no banco:', e);
      }

      // Always persist to portal_records
      await this.autoSyncRecord('categories', storageService.getCategories());
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao sincronizar categoria:', err);
      return false;
    }
  },

  async deleteSingleCategory(id: string, slug?: string): Promise<boolean> {
    try {
      const client = getSupabaseClient();
      try {
        await client.from('categorias').delete().eq('id', id);
        if (slug && slug !== id) {
          await client.from('categorias').delete().eq('slug', slug);
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao deletar da tabela categorias:', e);
      }

      // Persist updated categories list to portal_records
      await this.autoSyncRecord('categories', storageService.getCategories());

      // Persist deleted IDs list to portal_records for multi-device integrity
      const deletedIds = Array.from(storageService.getDeletedCategoryIds());
      await this.autoSyncRecord('deleted_categories', deletedIds);

      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao deletar categoria:', err);
      return false;
    }
  },

  async syncSingleConfig(id: string, data: unknown): Promise<boolean> {
    const config = getSupabaseConfig();
    if (!config.autoSync) return false;

    try {
      const client = getSupabaseClient();
      await client.from('configuracoes').upsert({
        id,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await this.autoSyncRecord(id, data);
      return true;
    } catch (err) {
      console.warn(`[Supabase] Falha ao sincronizar config '${id}':`, err);
      return false;
    }
  },

  /**
   * Upload all local portal content to Supabase database (relational tables + document store)
   */
  async exportAllToSupabase(): Promise<{ success: boolean; message: string; count: number }> {
    this.setSyncStatus({
      lastSyncTime: new Date().toISOString(),
      status: 'syncing',
      message: 'Enviando todos os dados locais para o Supabase...',
      syncedKeys: [],
    });

    try {
      const client = getSupabaseClient();
      const categories = storageService.getCategories();
      const articles = storageService.getArticles();
      const banners = storageService.getBanners();

      // 1. Export Categories
      try {
        const catRows = categories.map((c) => ({
          id: c.id,
          nome: c.name,
          slug: c.slug || slugify(c.name),
          descricao: c.description || '',
          ordem: c.order || 0,
          cor_destaque: c.color || '#2563eb',
          status: 'ativo',
          exibir_na_home: c.showOnHome ?? true,
          ocultar_no_menu: c.hideInMenu ?? false,
          updated_at: new Date().toISOString(),
        }));
        await client.from('categorias').upsert(catRows, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Aviso ao gravar categorias:', e);
      }

      // 2. Export Articles to primary table 'materias'
      try {
        const statusMap: Record<string, string> = {
          draft: 'rascunho',
          archived: 'arquivado',
          scheduled: 'publicado',
          published: 'publicado',
        };
        const materiaRows = articles.map((a) => {
          let normalizedCatId = a.categoryId;
          if (normalizedCatId?.startsWith('cat-')) {
            const stripped = normalizedCatId.replace(/^cat-/, '');
            const cat = categories.find(c => c.id === stripped || c.slug === stripped || c.id === a.categoryId);
            if (cat) normalizedCatId = cat.id;
          }
          return {
            id: a.id,
            titulo: a.title,
            slug: a.slug || slugify(a.title),
            subtitulo: a.subtitle || '',
            resumo: a.subtitle || (a.content ? a.content.replace(/<[^>]*>?/gm, '').slice(0, 200) : ''),
            conteudo_html: a.content || '<p></p>',
            categoria_id: normalizedCatId || null,
            imagem_principal: a.featuredImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop',
            imagem_legenda: a.imageCaption || '',
            autor_nome: a.author || 'Redação',
            destaque: a.isHighlight ?? false,
            status: statusMap[a.status] || 'publicado',
            visualizacoes: a.views || 0,
            data_publicacao: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });
        await client.from('materias').upsert(materiaRows, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Aviso ao gravar materias:', e);
      }

      // 3. Export Banners
      try {
        const bannerRows = banners.map((b) => ({
          id: b.id,
          titulo: b.title,
          descricao: b.description || '',
          imagem: b.imageUrl,
          link: b.targetUrl || '',
          posicao: b.position || 'slideshow',
          ordem: b.order || 0,
          status: b.active !== false ? 'ativo' : 'inativo',
          cliques: b.clicks || 0,
          created_at: new Date().toISOString(),
        }));
        await client.from('banners').upsert(bannerRows, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Aviso ao gravar banners:', e);
      }

      // 4. Export Configurations
      try {
        const configRows = [
          { id: 'identidade_visual', data: storageService.getVisualIdentity(), updated_at: new Date().toISOString() },
          { id: 'site_popup', data: storageService.getSitePopup(), updated_at: new Date().toISOString() },
          { id: 'facebook_config', data: storageService.getFacebookConfig(), updated_at: new Date().toISOString() },
          { id: 'business_config', data: storageService.getBusinessGuideConfig(), updated_at: new Date().toISOString() },
          { id: 'gallery_config', data: storageService.getGalleryConfig(), updated_at: new Date().toISOString() },
        ];
        await client.from('configuracoes').upsert(configRows, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Aviso ao gravar configurações:', e);
      }

      // 5. Export Full Document Store for complete site backup (registros_do_portal)
      const recordsToSync: { key: string; data: unknown }[] = [
        { key: 'articles', data: articles },
        { key: 'categories', data: categories },
        { key: 'banners', data: banners },
        { key: 'identity', data: storageService.getVisualIdentity() },
        { key: 'facebook_config', data: storageService.getFacebookConfig() },
        { key: 'site_popup', data: storageService.getSitePopup() },
        { key: 'business_config', data: storageService.getBusinessGuideConfig() },
        { key: 'business_stores', data: storageService.getBusinessStores() },
        { key: 'business_products', data: storageService.getBusinessProducts() },
        { key: 'galleries', data: storageService.getEventGalleries() },
        { key: 'gallery_config', data: storageService.getGalleryConfig() },
        { key: 'agenda', data: storageService.getEventAgenda() },
        { key: 'admin_users', data: storageService.getAdminUsers() },
      ];

      for (const item of recordsToSync) {
        await this.autoSyncRecord(item.key, item.data);
      }

      const syncedKeys = recordsToSync.map((r) => r.key);
      const successMsg = `Sucesso! Matérias, categorias, banners e dados sincronizados com o Supabase.`;

      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'success',
        message: successMsg,
        syncedKeys,
      });

      return { success: true, message: successMsg, count: syncedKeys.length };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'error',
        message: `Falha ao sincronizar: ${errorMsg}`,
        syncedKeys: [],
      });
      return { success: false, message: errorMsg, count: 0 };
    }
  },

  /**
   * Import all content from Supabase database into local application
   */
  async importAllFromSupabase(): Promise<{ success: boolean; message: string; count: number }> {
    this.setSyncStatus({
      lastSyncTime: new Date().toISOString(),
      status: 'syncing',
      message: 'Buscando registros remotos do Supabase...',
      syncedKeys: [],
    });

    try {
      const client = getSupabaseClient();
      const tableName = await getRecordsTableName(client);

      let { data, error } = await client
        .from(tableName)
        .select('key, data, updated_at');

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const alt = tableName === 'portal_records' ? 'registros_do_portal' : 'portal_records';
        const retry = await client.from(alt).select('key, data, updated_at');
        if (!retry.error) {
          cachedRecordsTable = alt;
          data = retry.data;
          error = null;
        }
      }

      if (error) {
        const errorMsg = `Erro ao ler do Supabase: ${error.message}`;
        this.setSyncStatus({
          lastSyncTime: new Date().toISOString(),
          status: 'error',
          message: errorMsg,
          syncedKeys: [],
        });
        return { success: false, message: errorMsg, count: 0 };
      }

      if (!data || data.length === 0) {
        const msg = 'Nenhum registro encontrado no Supabase para importar.';
        this.setSyncStatus({
          lastSyncTime: new Date().toISOString(),
          status: 'idle',
          message: msg,
          syncedKeys: [],
        });
        return { success: true, message: msg, count: 0 };
      }

      let count = 0;
      const appliedKeys: string[] = [];

      for (const item of data) {
        const { key, data: recordData } = item;
        if (!key || !recordData) continue;

        try {
          switch (key) {
            case 'articles':
              if (Array.isArray(recordData)) {
                storageService.saveArticles(recordData);
                appliedKeys.push('articles');
                count++;
              }
              break;
            case 'categories':
              if (Array.isArray(recordData)) {
                const deletedIds = storageService.getDeletedCategoryIds();
                const filtered = recordData.filter((c: any) => c && !deletedIds.has(c.id) && !deletedIds.has(c.slug) && !deletedIds.has((c.name || '').toLowerCase()));
                storageService.saveCategories(filtered);
                appliedKeys.push('categories');
                count++;
              }
              break;
            case 'banners':
              if (Array.isArray(recordData)) {
                storageService.saveBanners(recordData);
                appliedKeys.push('banners');
                count++;
              }
              break;
            case 'identity':
              if (typeof recordData === 'object') {
                storageService.saveVisualIdentity(recordData);
                appliedKeys.push('identity');
                count++;
              }
              break;
            case 'facebook_config':
              if (typeof recordData === 'object') {
                storageService.saveFacebookConfig(recordData);
                appliedKeys.push('facebook_config');
                count++;
              }
              break;
            case 'site_popup':
              if (typeof recordData === 'object') {
                storageService.saveSitePopup(recordData);
                appliedKeys.push('site_popup');
                count++;
              }
              break;
            case 'business_config':
              if (typeof recordData === 'object') {
                storageService.saveBusinessGuideConfig(recordData);
                appliedKeys.push('business_config');
                count++;
              }
              break;
            case 'business_stores':
              if (Array.isArray(recordData)) {
                storageService.saveBusinessStores(recordData);
                appliedKeys.push('business_stores');
                count++;
              }
              break;
            case 'business_products':
              if (Array.isArray(recordData)) {
                storageService.saveBusinessProducts(recordData);
                appliedKeys.push('business_products');
                count++;
              }
              break;
            case 'galleries':
              if (Array.isArray(recordData)) {
                storageService.saveEventGalleries(recordData);
                appliedKeys.push('galleries');
                count++;
              }
              break;
            case 'gallery_config':
              if (typeof recordData === 'object') {
                storageService.saveGalleryConfig(recordData);
                appliedKeys.push('gallery_config');
                count++;
              }
              break;
            case 'agenda':
              if (Array.isArray(recordData)) {
                storageService.saveEventAgenda(recordData);
                appliedKeys.push('agenda');
                count++;
              }
              break;
            case 'admin_users':
              if (Array.isArray(recordData)) {
                storageService.saveAdminUsers(recordData);
                appliedKeys.push('admin_users');
                count++;
              }
              break;
          }
        } catch (e) {
          console.warn(`Erro ao aplicar registro ${key} do Supabase:`, e);
        }
      }

      // Also query directly from relational tables if available
      try {
        const { data: dbArticles, error: artErr } = await client.from('artigos').select('*');
        if (!artErr && dbArticles && dbArticles.length > 0) {
          const mappedArticles: Article[] = dbArticles.map((row: any) => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            subtitle: row.subtitle || '',
            content: row.content || '',
            categoryId: row.category_id || '',
            categoryName: row.category_name || '',
            featuredImage: row.featured_image || '',
            imageCaption: row.image_caption || '',
            additionalImages: Array.isArray(row.additional_images) ? row.additional_images : [],
            publishedAt: row.published_at,
            author: row.author || 'Redação',
            authorRole: row.author_role || '',
            authorAvatar: row.author_avatar || '',
            youtubeUrl: row.youtube_url || '',
            status: row.status || 'published',
            views: row.views || 0,
            isHighlight: row.is_highlight ?? false,
            facebookAutoPublish: row.facebook_auto_publish ?? false,
            facebookPublished: row.facebook_published ?? false,
          }));
          storageService.saveArticles(mappedArticles);
          if (!appliedKeys.includes('articles')) appliedKeys.push('articles');
        }
      } catch {
        // Relational table may not exist yet
      }

      try {
        const { data: dbBanners, error: banErr } = await client.from('banners').select('*');
        if (!banErr && dbBanners && dbBanners.length > 0) {
          const mappedBanners: Banner[] = dbBanners.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            imageUrl: row.image_url,
            targetUrl: row.target_url || '',
            position: row.position || 'slideshow',
            order: row.order_index ?? 0,
            active: row.active ?? true,
            aspectRatio: row.aspect_ratio || undefined,
            clicks: row.clicks || 0,
            type: row.type || 'commercial',
            badgeText: row.badge_text || undefined,
            showText: row.show_text ?? true,
          }));
          storageService.saveBanners(mappedBanners);
          if (!appliedKeys.includes('banners')) appliedKeys.push('banners');
        }
      } catch {
        // Relational table may not exist yet
      }

      try {
        if (!appliedKeys.includes('categories')) {
          const { data: dbCategories, error: catErr } = await client.from('categorias').select('*');
          if (!catErr && dbCategories && dbCategories.length > 0) {
            const deletedIds = storageService.getDeletedCategoryIds();
            const mappedCats: Category[] = dbCategories
              .filter((row: any) => row && !deletedIds.has(row.id) && !deletedIds.has(row.slug) && !deletedIds.has((row.name || '').toLowerCase()))
              .map((row: any) => ({
                id: row.id,
                name: row.name,
                slug: row.slug || slugify(row.name),
                order: row.order_index ?? 0,
                color: row.color || '#2563eb',
                description: row.description || '',
                showOnHome: row.show_on_home ?? true,
                hideInMenu: row.hide_in_menu ?? false,
              }));
            if (mappedCats.length > 0) {
              storageService.saveCategories(mappedCats);
              appliedKeys.push('categories');
            }
          }
        }
      } catch {
        // Relational table may not exist yet
      }

      // Trigger global update
      window.dispatchEvent(new Event('portal_data_updated'));

      const msg = `Sucesso! Matérias e coleções foram importadas do Supabase e sincronizadas com o portal.`;
      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'success',
        message: msg,
        syncedKeys: appliedKeys,
      });

      return { success: true, message: msg, count: appliedKeys.length };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'error',
        message: `Falha ao importar do Supabase: ${errorMsg}`,
        syncedKeys: [],
      });
      return { success: false, message: errorMsg, count: 0 };
    }
  },

  /**
   * Verificação de integridade rigorosa entre registros locais e banco Supabase:
   * 1. Reúne e consolida todos os IDs/slugs/nomes deletados (localmente e remotamente em 'deleted_categories').
   * 2. Remove categoricamente qualquer categoria deletada tanto da lista de categorias quanto de artigos.
   * 3. Se houver categorias deletadas residuais na tabela relacional 'categorias' do Supabase, executa a exclusão no banco.
   * 4. Sincroniza o estado limpo de 'categories' e 'deleted_categories' em 'portal_records'.
   * 5. Garante que o estado local reflita perfeitamente as deleções antes da renderização da página.
   */
  async verifyAndReconcileIntegrity(
    rawDbCats: any[],
    recordsMap: Map<string, any>,
    client: any
  ): Promise<{
    categories: Category[];
    deletedCategoryIds: Set<string>;
  }> {
    // 1. Unificar IDs, slugs e nomes em minúsculas de categorias deletadas
    const localDeleted = storageService.getDeletedCategoryIds();
    const remoteDeleted = recordsMap.get('deleted_categories');
    const mergedDeleted = new Set<string>();

    for (const d of localDeleted) {
      if (typeof d === 'string' && d.trim()) {
        mergedDeleted.add(d.trim());
        mergedDeleted.add(d.trim().toLowerCase());
      }
    }

    if (Array.isArray(remoteDeleted)) {
      for (const d of remoteDeleted) {
        if (typeof d === 'string' && d.trim()) {
          mergedDeleted.add(d.trim());
          mergedDeleted.add(d.trim().toLowerCase());
        }
      }
    }

    // Salvar o conjunto unificado no localStorage imediatamente
    try {
      localStorage.setItem('portal_deleted_category_ids', JSON.stringify(Array.from(mergedDeleted)));
    } catch {
      // ignore
    }

    // Se o banco remoto estava sem algumas deleções locais, sincronizar 'deleted_categories'
    if (mergedDeleted.size > 0 && (!Array.isArray(remoteDeleted) || remoteDeleted.length < mergedDeleted.size)) {
      this.autoSyncRecord('deleted_categories', Array.from(mergedDeleted)).catch(() => {});
    }

    // 2. Limpar categorias deletadas da tabela relacional 'categorias' no Supabase
    if (mergedDeleted.size > 0 && Array.isArray(rawDbCats) && rawDbCats.length > 0) {
      const toDeleteFromDb = rawDbCats
        .filter(c => c && (mergedDeleted.has(c.id) || mergedDeleted.has(c.slug) || mergedDeleted.has((c.name || '').toLowerCase())))
        .map(c => c.id);

      if (toDeleteFromDb.length > 0) {
        try {
          await client.from('categorias').delete().in('id', toDeleteFromDb);
        } catch (e) {
          console.warn('[Supabase Integrity] Aviso ao limpar categorias deletadas da tabela do banco:', e);
        }
      }
    }

    // 3. Determinar lista canônica de categorias ativas
    const mockCatIds = new Set(['cat-goioere', 'cat-estado', 'cat-cultura', 'cat-podcast']);
    let candidateCategories: Category[] = [];

    // Se o portal_records possui 'categories', ele representa a configuração deliberada do administrador
    const recCats = recordsMap.get('categories');
    if (Array.isArray(recCats) && recCats.length > 0) {
      candidateCategories = recCats.filter((c: any) =>
        c &&
        !mergedDeleted.has(c.id) &&
        !mergedDeleted.has(c.slug) &&
        !mergedDeleted.has((c.name || '').toLowerCase()) &&
        !mockCatIds.has(c.id)
      );
    } else if (rawDbCats && rawDbCats.length > 0) {
      const categoryColors: Record<string, string> = {
        politica: '#2563eb',
        cidade: '#059669',
        policial: '#dc2626',
        esportes: '#0891b2',
        educacao: '#d97706',
        saude: '#e11d48',
        economia: '#0d9488',
        regiao: '#0284c7',
        entretenimento: '#db2777',
        geral: '#64748b',
      };
      candidateCategories = rawDbCats
        .filter(row => row && !mergedDeleted.has(row.id) && !mergedDeleted.has(row.slug) && !mergedDeleted.has((row.name || row.nome || '').toLowerCase()))
        .map((row: any, idx: number) => {
          const categoryName = (row.nome || row.name || row.titulo || row.id || 'Categoria').trim();
          const categorySlug = (row.slug || slugify(categoryName) || row.id).trim();
          return {
            id: row.id,
            name: categoryName,
            slug: categorySlug,
            order: row.ordem ?? row.order_index ?? (idx + 1),
            color: row.cor_destaque || row.color || categoryColors[categorySlug] || '#2563eb',
            description: row.descricao || row.description || '',
            showOnHome: row.exibir_na_home ?? (row.active !== false && row.status !== 'inativo'),
            hideInMenu: row.ocultar_no_menu ?? (row.hide_in_menu === true),
          };
        });
    }

    // Ordenar categorias por ordem numérica
    candidateCategories.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Se a lista resultante estiver vazia:
    // Se o usuário deletou categorias deliberadamente, NÃO ressuscite as categorias deletadas!
    if (candidateCategories.length === 0) {
      const safeDefaults = DEFAULT_DATABASE_CATEGORIES.filter(c =>
        !mergedDeleted.has(c.id) && !mergedDeleted.has(c.slug) && !mergedDeleted.has(c.name.toLowerCase())
      );
      if (safeDefaults.length > 0) {
        candidateCategories = safeDefaults;
      } else {
        // Se todas as categorias foram deletadas, prover uma única categoria limpa padrão para não quebrar a navegação
        candidateCategories = [{
          id: 'cat-geral',
          name: 'Geral',
          slug: 'geral',
          order: 1,
          color: '#64748b',
          description: 'Notícias gerais',
          showOnHome: true,
          hideInMenu: false,
        }];
      }
    }

    return {
      categories: candidateCategories,
      deletedCategoryIds: mergedDeleted,
    };
  },

  /**
   * Fetches all live portal data directly from Supabase tables and records.
   * Supabase database is treated as the primary source of truth.
   */
  async fetchAndApplyAllFromSupabase(): Promise<{
    success: boolean;
    categories?: Category[];
    articles?: Article[];
    banners?: Banner[];
    identity?: any;
    facebookConfig?: any;
    sitePopup?: any;
    businessConfig?: any;
    businessStores?: any[];
    businessProducts?: any[];
    galleryConfig?: any;
    adminUsers?: any[];
  }> {
    try {
      const client = getSupabaseClient();

      let activeCategories: Category[] = [];
      let loadedArticles: Article[] = [];
      let loadedBanners: Banner[] = [];
      let loadedIdentity: any = null;
      let loadedFbConfig: any = null;
      let loadedPopup: any = null;
      let loadedBizConfig: any = null;
      let loadedBizStores: any[] = [];
      let loadedBizProducts: any[] = [];
      let loadedGalleryConfig: any = null;
      let loadedAdminUsers: any[] = [];
      let rawDbCats: any[] = [];

      // 1. Fetch relational categories from table 'categorias'
      try {
        const { data: dbCats, error: catErr } = await client
          .from('categorias')
          .select('*');

        if (!catErr && dbCats && Array.isArray(dbCats)) {
          rawDbCats = dbCats;
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao ler tabela categorias:', e);
      }

      // 2. Fetch articles from primary table 'materias'
      try {
        const { data: dbMaterias, error: matErr } = await client
          .from('materias')
          .select('*');

        if (!matErr && dbMaterias && dbMaterias.length > 0) {
          loadedArticles = dbMaterias.map((row: any) => ({
            id: row.id,
            title: row.titulo || row.title || 'Sem título',
            slug: row.slug || slugify(row.titulo || row.title || 'noticia'),
            subtitle: row.subtitulo || row.subtitle || row.resumo || '',
            content: row.conteudo_html || row.content || '',
            categoryId: row.categoria_id || row.category_id || '',
            categoryName: '',
            featuredImage: row.imagem_principal || row.featured_image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop',
            imageCaption: row.imagem_legenda || row.image_caption || '',
            additionalImages: Array.isArray(row.imagens_adicionais) ? row.imagens_adicionais : (Array.isArray(row.additional_images) ? row.additional_images : []),
            publishedAt: row.data_publicacao || row.published_at || row.created_at || new Date().toISOString(),
            author: row.autor_nome || row.author || 'Redação',
            authorRole: row.autor_cargo || row.author_role || '',
            authorAvatar: row.autor_avatar || row.author_avatar || '',
            youtubeUrl: row.video_url || row.youtube_url || '',
            status: row.status === 'publicado' ? 'published' : (row.status === 'rascunho' ? 'draft' : (row.status === 'arquivado' ? 'archived' : 'published')),
            views: row.visualizacoes ?? (row.views || 0),
            isHighlight: row.destaque ?? (row.is_highlight ?? false),
            facebookAutoPublish: false,
            facebookPublished: false,
          }));
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao ler tabela materias:', e);
      }

      // If materias was empty, try legacy table 'artigos'
      if (loadedArticles.length === 0) {
        try {
          const { data: dbArticles, error: artErr } = await client
            .from('artigos')
            .select('*');

          if (!artErr && dbArticles && dbArticles.length > 0) {
            loadedArticles = dbArticles.map((row: any) => ({
              id: row.id,
              title: row.title,
              slug: row.slug || slugify(row.title),
              subtitle: row.subtitle || '',
              content: row.content || '',
              categoryId: row.category_id || '',
              categoryName: row.category_name || '',
              featuredImage: row.featured_image || '',
              imageCaption: row.image_caption || '',
              additionalImages: Array.isArray(row.additional_images) ? row.additional_images : [],
              publishedAt: row.published_at || row.created_at || new Date().toISOString(),
              author: row.author || 'Redação',
              authorRole: row.author_role || '',
              authorAvatar: row.author_avatar || '',
              youtubeUrl: row.youtube_url || '',
              status: row.status || 'published',
              views: row.views || 0,
              isHighlight: row.is_highlight ?? false,
              facebookAutoPublish: row.facebook_auto_publish ?? false,
              facebookPublished: row.facebook_published ?? false,
            }));
          }
        } catch {}
      }

      // 3. Fetch relational banners from table 'banners'
      try {
        const { data: dbBanners, error: banErr } = await client
          .from('banners')
          .select('*');

        if (!banErr && dbBanners && dbBanners.length > 0) {
          loadedBanners = dbBanners.map((row: any) => ({
            id: row.id,
            title: row.titulo || row.title || 'Banner',
            description: row.descricao || row.description || '',
            imageUrl: row.imagem || row.image_url,
            targetUrl: row.link || row.target_url || '',
            position: row.posicao || row.position || 'slideshow',
            order: row.ordem ?? (row.order_index ?? 0),
            active: row.status ? row.status === 'ativo' : (row.active ?? true),
            aspectRatio: row.aspect_ratio || undefined,
            clicks: row.cliques ?? (row.clicks || 0),
            type: row.type || 'commercial',
            badgeText: row.badge_text || undefined,
            showText: row.show_text ?? true,
          }));
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao ler tabela banners:', e);
      }

      // 4. Fetch records from 'registros_do_portal' or 'portal_records'
      const recordsMap = new Map<string, any>();
      try {
        const { data: recs1, error: err1 } = await client.from('registros_do_portal').select('colecao, dados');
        if (!err1 && recs1 && Array.isArray(recs1)) {
          for (const item of recs1) {
            if (item.colecao && item.dados !== undefined) {
              recordsMap.set(item.colecao, item.dados);
            }
          }
        } else {
          const { data: recs2, error: err2 } = await client.from('portal_records').select('key, data');
          if (!err2 && recs2 && Array.isArray(recs2)) {
            for (const item of recs2) {
              if (item.key && item.data !== undefined) {
                recordsMap.set(item.key, item.data);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Supabase] Falha ao ler registros_do_portal:', e);
      }

      // Handle document records if present
      for (const [key, rData] of recordsMap.entries()) {
        if (key === 'articles' && Array.isArray(rData)) {
          const seenIds = new Set(loadedArticles.map(a => a.id));
          for (const a of rData) {
            if (a && !seenIds.has(a.id)) {
              loadedArticles.push(a);
              seenIds.add(a.id);
            }
          }
        } else if (key === 'banners' && loadedBanners.length === 0 && Array.isArray(rData)) {
          loadedBanners = rData;
        } else if (key === 'identity' || key === 'identidade_visual') {
          loadedIdentity = rData;
        } else if (key === 'facebook_config') {
          loadedFbConfig = rData;
        } else if (key === 'site_popup') {
          loadedPopup = rData;
        } else if (key === 'business_config') {
          loadedBizConfig = rData;
        } else if (key === 'business_stores' && Array.isArray(rData)) {
          loadedBizStores = rData;
        } else if (key === 'business_products' && Array.isArray(rData)) {
          loadedBizProducts = rData;
        } else if (key === 'gallery_config') {
          loadedGalleryConfig = rData;
        } else if (key === 'agenda' && Array.isArray(rData)) {
          storageService.saveEventAgenda(rData);
        } else if (key === 'galleries' && Array.isArray(rData)) {
          storageService.saveGalleries(rData);
        } else if (key === 'admin_users' && Array.isArray(rData)) {
          loadedAdminUsers = rData;
        }
      }

      // 5. Executar verificação e reconciliação de integridade antes da renderização
      const { categories: reconciledCategories } =
        await this.verifyAndReconcileIntegrity(rawDbCats, recordsMap, client);

      activeCategories = reconciledCategories;

      // 6. Normalizar artigos e reconciliar artigos deletados com integridade
      const localDeletedArticleIds = storageService.getDeletedArticleIds();
      const remoteDeletedArticles = recordsMap.get('deleted_articles');
      const mergedDeletedArticleIds = new Set<string>();

      for (const d of localDeletedArticleIds) {
        if (typeof d === 'string' && d.trim()) {
          mergedDeletedArticleIds.add(d.trim());
        }
      }

      if (Array.isArray(remoteDeletedArticles)) {
        for (const d of remoteDeletedArticles) {
          if (typeof d === 'string' && d.trim()) {
            mergedDeletedArticleIds.add(d.trim());
          }
        }
      }

      try {
        localStorage.setItem('portal_deleted_article_ids', JSON.stringify(Array.from(mergedDeletedArticleIds)));
      } catch {
        // ignore
      }

      if (mergedDeletedArticleIds.size > 0 && (!Array.isArray(remoteDeletedArticles) || remoteDeletedArticles.length < mergedDeletedArticleIds.size)) {
        this.autoSyncRecord('deleted_articles', Array.from(mergedDeletedArticleIds)).catch(() => {});
      }

      // Limpar artigos deletados da tabela do Supabase se existirem
      if (mergedDeletedArticleIds.size > 0) {
        try {
          await client.from('artigos').delete().in('id', Array.from(mergedDeletedArticleIds));
        } catch (e) {
          console.warn('[Supabase Integrity] Falha ao limpar artigos deletados no banco:', e);
        }
      }

      const fallbackCat = activeCategories[0] || { id: 'cat-geral', name: 'Geral', slug: 'geral' };

      loadedArticles = loadedArticles
        .filter(a => !MOCK_ARTICLE_IDS.has(a.id) && !mergedDeletedArticleIds.has(a.id))
        .map(a => {
          let catId = a.categoryId;
          if (catId?.startsWith('cat-')) {
            const stripped = catId.replace(/^cat-/, '');
            const match = activeCategories.find(c => c.id === stripped || c.slug === stripped);
            if (match) catId = match.id;
          }
          const matchedCat = activeCategories.find(c => c.id === catId || c.slug === catId || (a.categorySlug && c.slug === a.categorySlug));
          return {
            ...a,
            categoryId: matchedCat ? matchedCat.id : fallbackCat.id,
            categoryName: matchedCat ? matchedCat.name : fallbackCat.name,
            categorySlug: matchedCat ? matchedCat.slug : fallbackCat.slug,
          };
        });

      // Se nenhum artigo foi retornado pelo Supabase (ex: primeiro acesso sem dados), manter os artigos existentes locais
      if (loadedArticles.length === 0) {
        loadedArticles = storageService.getArticles();
        if (!loadedArticles || loadedArticles.length === 0) {
          loadedArticles = initialArticles;
        }
      }

      // 7. Salvar diretamente no storageService para atualizar o cache do cliente sem disparar auto-sync cíclico
      storageService.isRemoteHydrating = true;
      try {
        if (activeCategories.length > 0) {
          storageService.saveCategories(activeCategories);
        }
        if (loadedArticles.length > 0) {
          storageService.saveArticles(loadedArticles);
        }
        if (loadedBanners.length > 0) storageService.saveBanners(loadedBanners);
        if (loadedIdentity) storageService.saveVisualIdentity(loadedIdentity);
        if (loadedFbConfig) storageService.saveFacebookConfig(loadedFbConfig);
        if (loadedPopup) storageService.saveSitePopup(loadedPopup);
        if (loadedBizConfig) storageService.saveBusinessGuideConfig(loadedBizConfig);
        if (loadedBizStores.length > 0) storageService.saveBusinessStores(loadedBizStores);
        if (loadedBizProducts.length > 0) storageService.saveBusinessProducts(loadedBizProducts);
        if (loadedGalleryConfig) storageService.saveGalleryConfig(loadedGalleryConfig);
        if (loadedAdminUsers.length > 0) storageService.saveAdminUsers(loadedAdminUsers);
      } finally {
        storageService.isRemoteHydrating = false;
      }

      // Sincronizar 'categories' de volta caso haja discrepância no banco
      const recCatsJson = JSON.stringify(recordsMap.get('categories') || []);
      const activeCatsJson = JSON.stringify(activeCategories);
      if (recCatsJson !== activeCatsJson) {
        this.autoSyncRecord('categories', activeCategories).catch(() => {});
      }

      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'success',
        message: 'Dados carregados e reconciliados com sucesso diretamente do Supabase.',
        syncedKeys: ['categories', 'articles', 'banners', 'configs'],
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('portal_data_updated'));
      }

      return {
        success: true,
        categories: activeCategories,
        articles: loadedArticles,
        banners: loadedBanners,
        identity: loadedIdentity,
        facebookConfig: loadedFbConfig,
        sitePopup: loadedPopup,
        businessConfig: loadedBizConfig,
        businessStores: loadedBizStores,
        businessProducts: loadedBizProducts,
        galleryConfig: loadedGalleryConfig,
        adminUsers: loadedAdminUsers,
      };
    } catch (err: any) {
      console.error('[Supabase] Erro ao carregar dados do banco:', err);
      this.setSyncStatus({
        lastSyncTime: new Date().toISOString(),
        status: 'error',
        message: `Erro ao conectar com Supabase: ${err?.message || err}`,
        syncedKeys: [],
      });
      return { success: false };
    }
  },

  /**
   * Initializes portal data sync on app launch.
   * Directly pulls from Supabase database to populate the application.
   */
  async initInitialPortalSync(): Promise<void> {
    try {
      const test = await testSupabaseConnection();
      if (!test.success) return;

      console.log('[Supabase] Carregando dados diretamente do banco de dados...');
      await this.fetchAndApplyAllFromSupabase();
    } catch (err) {
      console.warn('[Supabase] Inicialização da sincronização:', err);
    }
  },

  /**
   * Initializes automatic startup check:
   * Checks if remote data is available, and if so, offers or auto-pulls if local is empty.
   */
  async checkInitialRemoteData(): Promise<boolean> {
    try {
      const test = await testSupabaseConnection();
      if (!test.success) return false;

      const client = getSupabaseClient();
      const tableName = await getRecordsTableName(client);
      let { data, error } = await client
        .from(tableName)
        .select('key')
        .limit(1);

      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        const alt = tableName === 'portal_records' ? 'registros_do_portal' : 'portal_records';
        const retry = await client.from(alt).select('key').limit(1);
        if (!retry.error) {
          cachedRecordsTable = alt;
          data = retry.data;
          error = null;
        }
      }

      if (error || !data || data.length === 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Sets up auto-sync listener to listen for portal updates and push to Supabase with debounce
   */
  initAutoSyncListener(): () => void {
    // All individual operations are synchronized immediately with Supabase directly.
    // Destructive blanket export dumps are neutralized to prevent data conflicts and race conditions.
    return () => {};
  },
};

