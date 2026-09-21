import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ChevronsUp,
  ChevronsDown,
  Layers, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Home, 
  ArrowUpDown, 
  Sparkles, 
  Navigation,
  ListOrdered,
  Store,
  Camera,
  Radio,
  Calendar,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Settings,
  FolderTree
} from 'lucide-react';
import { Category, Article, NavigationMenuItem } from '../../types';
import { storageService, slugify } from '../../services/storageService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminCategoriesProps {
  categories: Category[];
  articles: Article[];
  onRefresh?: () => void;
}

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  articles,
  onRefresh,
}) => {
  // Synchronized categories state
  const [categoryList, setCategoryList] = useState<Category[]>(categories);

  useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  // Navigation Menu Items (Order of the full site top bar)
  const [menuItems, setMenuItems] = useState<NavigationMenuItem[]>(() => 
    storageService.getNavigationMenuItems()
  );

  // Filter mode: all items, categories only, or system modules only
  const [filterMode, setFilterMode] = useState<'all' | 'categories' | 'system'>('all');

  // Form states for creating/editing categories
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [description, setDescription] = useState('');
  const [showOnHome, setShowOnHome] = useState(true);
  const [hideInMenu, setHideInMenu] = useState(false);
  const [order, setOrder] = useState<number>(menuItems.length + 1);

  // System item label editing
  const [editingSystemItem, setEditingSystemItem] = useState<NavigationMenuItem | null>(null);
  const [systemItemLabel, setSystemItemLabel] = useState('');

  // Notifications & Modals
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Refresh menuItems whenever categories prop changes or when portal_data_updated fires
  useEffect(() => {
    const handleUpdate = () => {
      setMenuItems(storageService.getNavigationMenuItems());
    };
    window.addEventListener('portal_data_updated', handleUpdate);
    return () => window.removeEventListener('portal_data_updated', handleUpdate);
  }, []);

  useEffect(() => {
    setMenuItems(storageService.getNavigationMenuItems());
  }, [categories]);

  // Sorted categories for category-only views
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  // Displayed items based on filter tab
  const displayedItems = useMemo(() => {
    if (filterMode === 'categories') {
      return menuItems.filter(item => item.type === 'category');
    }
    if (filterMode === 'system') {
      return menuItems.filter(item => item.type === 'system');
    }
    return menuItems;
  }, [menuItems, filterMode]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setColor('#2563eb');
    setDescription('');
    setShowOnHome(true);
    setHideInMenu(false);
    setOrder(menuItems.length + 1);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setColor(cat.color || '#2563eb');
    setDescription(cat.description || '');
    setShowOnHome(cat.showOnHome ?? true);
    setHideInMenu(cat.hideInMenu ?? false);

    // Find current position in menuItems
    const menuItem = menuItems.find(m => m.categoryId === cat.id || m.id === `cat-${cat.id}`);
    setOrder(menuItem ? menuItem.order : cat.order || (menuItems.length + 1));
  };

  const handleStartEditSystemItem = (item: NavigationMenuItem) => {
    setEditingSystemItem(item);
    setSystemItemLabel(item.label);
  };

  const handleSaveSystemItemLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSystemItem || !systemItemLabel.trim()) return;

    const updated = menuItems.map(m => {
      if (m.id === editingSystemItem.id) {
        return {
          ...m,
          label: systemItemLabel.trim(),
        };
      }
      return m;
    });

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    setEditingSystemItem(null);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `Nome da aba "${systemItemLabel.trim()}" atualizado com sucesso!`
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle Visibility in Menu for ANY item (system or category)
  const handleToggleMenuItemVisibility = (item: NavigationMenuItem) => {
    const updated = menuItems.map(m => {
      if (m.id === item.id) {
        return {
          ...m,
          enabled: !m.enabled,
        };
      }
      return m;
    });

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);

    // If it's a category, also update category
    if (item.categoryId) {
      const cat = categories.find(c => c.id === item.categoryId);
      if (cat) {
        storageService.saveCategory({
          ...cat,
          hideInMenu: item.enabled, // Toggle: if it was enabled, it now becomes hidden
        });
      }
    }

    onRefresh?.();
    setMessage({
      type: 'success',
      text: !item.enabled
        ? `"${item.label}" agora está VISÍVEL no menu do site!`
        : `"${item.label}" foi OCULTADA do menu do site.`
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle Show On Homepage for Categories
  const handleToggleShowOnHome = (cat: Category) => {
    const updated = {
      ...cat,
      showOnHome: !(cat.showOnHome ?? true)
    };
    storageService.saveCategory(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: updated.showOnHome
        ? `Categoria "${cat.name}" agora será exibida na Home!`
        : `Categoria "${cat.name}" foi ocultada da Home.`
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Move menu item step up or down
  const moveMenuItemOrder = (itemId: string, direction: 'up' | 'down') => {
    const currentIndex = menuItems.findIndex(m => m.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;

    const list = [...menuItems];
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `Posição alterada: "${temp.label}" agora é a #${targetIndex + 1} no menu do site.`
    });
    setTimeout(() => setMessage(null), 2500);
  };

  // Move menu item to top (1st place)
  const moveMenuItemToTop = (itemId: string) => {
    const currentIndex = menuItems.findIndex(m => m.id === itemId);
    if (currentIndex <= 0) return;

    const list = [...menuItems];
    const [item] = list.splice(currentIndex, 1);
    list.unshift(item);

    const updated = list.map((m, idx) => ({
      ...m,
      order: idx + 1,
    }));

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `"${item.label}" movida para a 1ª posição do menu superior!`
    });
    setTimeout(() => setMessage(null), 2500);
  };

  // Move menu item to bottom (last place)
  const moveMenuItemToBottom = (itemId: string) => {
    const currentIndex = menuItems.findIndex(m => m.id === itemId);
    if (currentIndex === -1 || currentIndex === menuItems.length - 1) return;

    const list = [...menuItems];
    const [item] = list.splice(currentIndex, 1);
    list.push(item);

    const updated = list.map((m, idx) => ({
      ...m,
      order: idx + 1,
    }));

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `"${item.label}" movida para a última posição do menu.`
    });
    setTimeout(() => setMessage(null), 2500);
  };

  // Change position by direct numeric input/select
  const changeMenuItemPositionDirectly = (itemId: string, newPosition: number) => {
    const currentIndex = menuItems.findIndex(m => m.id === itemId);
    if (currentIndex === -1) return;

    const list = [...menuItems];
    const [item] = list.splice(currentIndex, 1);
    const clampedIndex = Math.max(0, Math.min(newPosition - 1, list.length));
    list.splice(clampedIndex, 0, item);

    const updated = list.map((m, idx) => ({
      ...m,
      order: idx + 1,
    }));

    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `Posição de "${item.label}" alterada para #${clampedIndex + 1} no menu do site.`
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Sort categories alphabetically A-Z while maintaining system items in place
  const handleSortCategoriesAlphabetically = () => {
    if (!window.confirm('Deseja organizar as editorias de notícias em ordem alfabética (A-Z) no menu?')) {
      return;
    }

    const systemItems = menuItems.filter(m => m.type === 'system');
    const categoryItems = menuItems
      .filter(m => m.type === 'category')
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    const reassembled = [...systemItems, ...categoryItems].map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    storageService.saveNavigationMenuItems(reassembled);
    setMenuItems(reassembled);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: 'Editorias de notícias organizadas em ordem alfabética (A-Z) com sucesso!'
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Reset to system defaults
  const handleResetToDefaults = () => {
    if (!window.confirm('Deseja restaurar a ordem padrão original do menu superior?')) {
      return;
    }
    const defaults = storageService.resetNavigationMenuItems();
    setMenuItems(defaults);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: 'A ordem padrão original do menu foi restaurada!'
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Renumber sequentially 1..N
  const handleRenumberSequentially = () => {
    const updated = menuItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));
    storageService.saveNavigationMenuItems(updated);
    setMenuItems(updated);
    onRefresh?.();
    setMessage({
      type: 'success',
      text: `Ordem sequencial normalizada (1 até ${menuItems.length}) com sucesso!`
    });
    setTimeout(() => setMessage(null), 3000);
  };

  // Save Category Form (create or edit)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'O nome da categoria é obrigatório.' });
      return;
    }

    const desiredOrder = Math.max(1, Number(order) || (menuItems.length + 1));
    const targetSlug = slug.trim() || slugify(name);

    if (editingId) {
      const existingCategory = categories.find(c => c.id === editingId);
      const updatedCategory: Category = {
        ...(existingCategory || {}),
        id: editingId,
        name: name.trim(),
        slug: targetSlug,
        color,
        description: description.trim(),
        showOnHome,
        hideInMenu,
        order: desiredOrder,
      };

      storageService.saveCategory(updatedCategory);

      // Re-position in menu items
      const updatedMenu = [...menuItems];
      const menuIdx = updatedMenu.findIndex(m => m.categoryId === editingId || m.id === `cat-${editingId}`);
      if (menuIdx !== -1) {
        const [movedItem] = updatedMenu.splice(menuIdx, 1);
        movedItem.label = name.trim();
        movedItem.color = color;
        movedItem.enabled = !hideInMenu;
        movedItem.path = `/noticias/${targetSlug}`;
        const targetMenuIdx = Math.max(0, Math.min(desiredOrder - 1, updatedMenu.length));
        updatedMenu.splice(targetMenuIdx, 0, movedItem);
        storageService.saveNavigationMenuItems(updatedMenu);
        setMenuItems(updatedMenu);
      }

      setMessage({ 
        type: 'success', 
        text: `Categoria "${name.trim()}" atualizada com sucesso!` 
      });
    } else {
      const newCategory: Category = {
        id: 'cat-' + Date.now(),
        name: name.trim(),
        slug: targetSlug,
        color,
        description: description.trim(),
        showOnHome,
        hideInMenu,
        order: desiredOrder,
      };

      storageService.saveCategory(newCategory);

      // Place in menu items
      const updatedMenu = [...menuItems];
      const newMenuItem: NavigationMenuItem = {
        id: `cat-${newCategory.id}`,
        label: newCategory.name,
        path: `/noticias/${newCategory.slug}`,
        type: 'category',
        categoryId: newCategory.id,
        color: newCategory.color,
        order: desiredOrder,
        enabled: !hideInMenu,
      };

      const targetMenuIdx = Math.max(0, Math.min(desiredOrder - 1, updatedMenu.length));
      updatedMenu.splice(targetMenuIdx, 0, newMenuItem);
      storageService.saveNavigationMenuItems(updatedMenu);
      setMenuItems(updatedMenu);

      setMessage({ 
        type: 'success', 
        text: `Nova categoria "${name.trim()}" criada na posição #${desiredOrder} do menu!` 
      });
    }

    resetForm();
    onRefresh?.();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = (cat: Category) => {
    setCategoryToDelete(cat);
  };

  const executeConfirmDelete = () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete.name;
    const catId = categoryToDelete.id;
    const catSlug = categoryToDelete.slug;

    // Remove from storage and Supabase
    storageService.deleteCategory(catId, catSlug);

    // Synchronize local states immediately
    const updatedCategories = storageService.getCategories();
    const updatedMenuItems = storageService.getNavigationMenuItems();
    setCategoryList(updatedCategories);
    setMenuItems(updatedMenuItems);

    if (editingId === catId) {
      resetForm();
    }
    setCategoryToDelete(null);
    onRefresh?.();
    setMessage({ type: 'success', text: `Categoria "${catName}" excluída permanentemente com sucesso.` });
    setTimeout(() => setMessage(null), 3500);
  };

  // Helper to render system icon
  const getSystemIcon = (systemKey?: string) => {
    switch (systemKey) {
      case 'home':
        return <Home className="w-4 h-4 text-red-600" />;
      case 'ultimas':
        return <Radio className="w-4 h-4 text-red-600 animate-pulse" />;
      case 'guia':
        return <Store className="w-4 h-4 text-emerald-600" />;
      case 'galerias':
        return <Camera className="w-4 h-4 text-purple-600" />;
      case 'agenda':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'podcasts':
        return <Radio className="w-4 h-4 text-purple-600" />;
      default:
        return <Navigation className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-red-600" />
            <span>Organização do Menu & Categorias</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Ajuste livremente a <strong>ordem de exibição de todas as abas e categorias</strong> no topo do site (Início, Notícias, Guia, Galerias, Agenda, Podcasts e Editorias).
          </p>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSortCategoriesAlphabetically}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Organizar todas as editorias de notícias em ordem alfabética (A-Z)"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Categorias A-Z</span>
          </button>
          <button
            type="button"
            onClick={handleRenumberSequentially}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Garante que as posições sejam 1, 2, 3... sem intervalos"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Renumerar 1..{menuItems.length}</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-red-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restaurar a ordem recomendada de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
            <span>Ordem Padrão</span>
          </button>
        </div>
      </div>

      {/* Live Interactive Preview Bar of Navigation Menu */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Prévia Visual do Menu Superior (Ordem Real no Site)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {menuItems.filter(i => i.enabled).length} de {menuItems.length} abas visíveis no site
          </span>
        </div>

        {/* Scrollable Live Menu Tabs */}
        <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-700/60 overflow-x-auto scrollbar-none flex items-center gap-1.5 text-xs font-semibold">
          {menuItems.map((item, idx) => {
            const isHidden = !item.enabled;
            const isSystem = item.type === 'system';

            return (
              <div
                key={item.id}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-all shadow-2xs ${
                  isHidden
                    ? 'bg-slate-900/60 text-slate-500 line-through border border-dashed border-slate-700/50 opacity-60'
                    : isSystem
                    ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:border-red-500/50'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 hover:border-slate-500'
                }`}
                title={
                  isHidden
                    ? `Posição #${idx + 1}: ${item.label} (Oculta do Menu do Site)`
                    : `Posição #${idx + 1} no Menu: ${item.label} (${isSystem ? 'Módulo do Sistema' : 'Editoria'})`
                }
              >
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/50 text-red-400 font-black">
                  #{idx + 1}
                </span>

                {isSystem ? (
                  <span className="shrink-0">{getSystemIcon(item.systemKey)}</span>
                ) : (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color || '#2563eb' }}
                  />
                )}

                <span>{item.label}</span>

                {isHidden && (
                  <span className="text-[9px] no-underline text-amber-400 font-normal ml-0.5">
                    (oculto)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Two Columns: Form (5 cols) + Full Navigation Reorderable List (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs h-fit">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-600" />
              <span>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</span>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-normal cursor-pointer"
              >
                + Criar Nova
              </button>
            )}
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome da Categoria *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
                placeholder="Ex: Política, Cidade, Esportes..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Position / Order Field in Form */}
            <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-red-900 uppercase tracking-wider">
                Ordem / Posição no Menu do Site *
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  min={1}
                  max={menuItems.length + (editingId ? 0 : 1)}
                  value={order}
                  onChange={(e) => setOrder(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
                <span className="text-[11px] text-slate-600 leading-snug">
                  Posição exata no menu superior (1 até {menuItems.length + (editingId ? 0 : 1)}).
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setOrder(1)}
                  className="px-2 py-0.5 bg-white hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold text-red-700 transition-colors cursor-pointer"
                >
                  Colocar em 1º lugar
                </button>
                <button
                  type="button"
                  onClick={() => setOrder(menuItems.length + (editingId ? 0 : 1))}
                  className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Colocar no fim ({menuItems.length + (editingId ? 0 : 1)}º)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Identificador (Slug / URL)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ex: politica"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cor de Destaque
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600">{color}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descrição Curta
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição temática da editoria..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
              />
            </div>

            {/* Show on Homepage Toggle */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOnHome}
                  onChange={(e) => setShowOnHome(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-red-600" />
                  <span>Exibir bloco desta categoria na Home do site</span>
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6 leading-tight">
                Se desmarcado, a categoria permanece no menu e na busca, mas sua seção de matérias não aparece na página inicial.
              </p>
            </div>

            {/* Hide in Navigation Menu Toggle */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideInMenu}
                  onChange={(e) => setHideInMenu(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ocultar esta categoria do Menu Superior (Header)</span>
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6 leading-tight">
                Se marcado, a categoria não aparecerá na barra de menu principal nem no menu do celular.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Salvar Alterações' : 'Salvar Categoria'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Full Menu Reordering List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Header with Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ordem Manual do Menu Superior ({menuItems.length} abas)
              </h3>
              <p className="text-[11px] text-slate-400">
                Altere a posição pelas setas ou selecione o número da posição (#1, #2, #3...)
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({menuItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('categories')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'categories'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editorias ({sortedCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('system')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterMode === 'system'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Módulos ({menuItems.filter(m => m.type === 'system').length})
              </button>
            </div>
          </div>

          {/* List of Menu Items */}
          <div className="space-y-2.5">
            {displayedItems.map((item) => {
              const itemGlobalIndex = menuItems.findIndex(m => m.id === item.id);
              const isFirst = itemGlobalIndex === 0;
              const isLast = itemGlobalIndex === menuItems.length - 1;
              const isSystem = item.type === 'system';

              // If category, find matching category object
              const rawItemId = item.id.replace(/^cat-/, '');
              const cat = isSystem 
                ? null 
                : (categories.find(c => 
                    c.id === item.categoryId || 
                    c.id === item.id || 
                    c.id.replace(/^cat-/, '') === rawItemId ||
                    `cat-${c.id}` === item.id ||
                    (item.path && item.path === `/noticias/${c.slug}`) ||
                    (c.slug && (c.slug === rawItemId || c.slug === item.categoryId)) ||
                    c.name.toLowerCase() === item.label.toLowerCase()
                  ) || {
                    id: item.categoryId || item.id,
                    name: item.label,
                    slug: item.path?.replace('/noticias/', '') || rawItemId,
                    order: item.order,
                    color: item.color || '#2563eb',
                    showOnHome: true,
                    hideInMenu: !item.enabled
                  });

              const articleCount = cat 
                ? articles.filter(a => a.categoryId === cat.id || a.categoryId === cat.slug || a.categorySlug === cat.slug).length
                : 0;

              const isVisibleInMenu = item.enabled;
              const isVisibleOnHome = cat ? cat.showOnHome !== false : true;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all gap-3 ${
                    editingId && cat && editingId === cat.id
                      ? 'bg-red-50/50 border-red-300 ring-2 ring-red-500/20 shadow-xs'
                      : !isVisibleInMenu
                      ? 'bg-slate-100/70 border-dashed border-slate-300 opacity-80'
                      : isSystem
                      ? 'bg-blue-50/30 border-slate-200/90 hover:border-blue-300 hover:bg-white'
                      : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {/* Left: Position Indicator & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Position Dropdown */}
                    <div className="flex flex-col items-center shrink-0">
                      <label 
                        htmlFor={`order-select-${item.id}`}
                        className="text-[9px] font-bold uppercase tracking-wider text-slate-400"
                      >
                        Posição
                      </label>
                      <select
                        id={`order-select-${item.id}`}
                        value={itemGlobalIndex + 1}
                        onChange={(e) => changeMenuItemPositionDirectly(item.id, parseInt(e.target.value))}
                        className="w-12 h-7 text-xs font-black bg-white border-2 border-red-600/40 text-red-700 rounded-lg text-center cursor-pointer shadow-2xs hover:border-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                        title="Selecione a posição do menu para onde mover esta aba"
                      >
                        {menuItems.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            #{i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Icon or Color Dot */}
                    {isSystem ? (
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                        {getSystemIcon(item.systemKey)}
                      </div>
                    ) : (
                      <span 
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs" 
                        style={{ backgroundColor: item.color || cat?.color || '#2563eb' }} 
                      />
                    )}

                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {item.label}
                        </p>

                        {/* Type Badges */}
                        {isSystem ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100/70 text-blue-800 border border-blue-200 shrink-0">
                            Módulo do Sistema
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            Editoria
                          </span>
                        )}

                        {/* Visibility Badges */}
                        {isVisibleInMenu ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <Eye className="w-2.5 h-2.5" />
                            <span>No Menu</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            <EyeOff className="w-2.5 h-2.5 text-amber-600" />
                            <span>Oculto no Menu</span>
                          </span>
                        )}

                        {cat && (
                          isVisibleOnHome ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                              <Home className="w-2.5 h-2.5" />
                              <span>Na Home</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Oculta da Home</span>
                            </span>
                          )
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.path}
                        {cat ? ` • ${articleCount} matéria${articleCount !== 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quick Ordering Buttons & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    {/* Order adjustment group */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                      {/* Move to top (1st) */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveMenuItemToTop(item.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Mover para o 1º lugar do menu"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move up 1 step */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveMenuItemOrder(item.id, 'up')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-black font-bold disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Subir uma posição no menu"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move down 1 step */}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveMenuItemOrder(item.id, 'down')}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-700 hover:text-black font-bold disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Descer uma posição no menu"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Move to bottom (last) */}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveMenuItemToBottom(item.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                        title="Mover para a última posição do menu"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 hidden sm:block mx-0.5" />

                    {/* Instant Menu Toggle (Eye) */}
                    <button
                      type="button"
                      onClick={() => handleToggleMenuItemVisibility(item)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        isVisibleInMenu
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'text-amber-700 bg-amber-100/70 hover:bg-amber-200'
                      }`}
                      title={isVisibleInMenu ? 'Visível no Menu. Clique para ocultar do menu' : 'Oculto do Menu. Clique para exibir no menu'}
                    >
                      {isVisibleInMenu ? <Eye className="w-3.5 h-3.5 text-slate-600" /> : <EyeOff className="w-3.5 h-3.5 text-amber-700" />}
                    </button>

                    {/* Category specific actions */}
                    {cat ? (
                      <>
                        {/* Instant Home Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleShowOnHome(cat)}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            isVisibleOnHome
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title={isVisibleOnHome ? 'Exibindo na Home. Clique para ocultar' : 'Oculta da Home. Clique para exibir na página inicial'}
                        >
                          <Home className={`w-3.5 h-3.5 ${isVisibleOnHome ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </button>

                        {/* Edit Category */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Editar categoria (nome, cor, slug)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Category */}
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      /* System item rename button */
                      <button
                        type="button"
                        onClick={() => handleStartEditSystemItem(item)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Renomear esta aba do menu"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dedicated Section: Gerenciamento e Exclusão Manual de Categorias */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-red-600" />
                <span>Excluir e Gerenciar Categorias Cadastradas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lista de todas as editorias ativas no banco de dados. Exclua categorias que não deseja mais utilizar no portal.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full w-fit">
              {categoryList.length} categoria{categoryList.length !== 1 ? 's' : ''} encontrada{categoryList.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {categoryList.map((cat) => {
              const articleCount = articles.filter(
                a => a.categoryId === cat.id || a.categoryId === cat.slug || a.categorySlug === cat.slug
              ).length;
              const isBeingEdited = editingId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`py-3.5 px-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isBeingEdited ? 'bg-red-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color || '#dc2626' }}
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          /{cat.slug}
                        </span>
                        {cat.showOnHome !== false ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Home Ativa
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Home Oculta
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {articleCount} matéria{articleCount !== 1 ? 's' : ''} associada{articleCount !== 1 ? 's' : ''}
                        {cat.description ? ` • ${cat.description}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleShowOnHome(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        cat.showOnHome !== false
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={cat.showOnHome !== false ? 'Clique para ocultar da Home' : 'Clique para exibir na Home'}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{cat.showOnHome !== false ? 'Na Home' : 'Oculta'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200"
                      title="Editar categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="px-2.5 py-1.5 rounded-lg text-red-600 hover:text-white hover:bg-red-600 transition-colors cursor-pointer border border-red-200 hover:border-red-600 flex items-center gap-1 text-xs font-bold shadow-2xs"
                      title="Excluir esta categoria manualmente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit System Item Modal */}
      {editingSystemItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-red-600" />
                <span>Renomear Aba do Menu</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSystemItem(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSystemItemLabel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rótulo da Aba no Menu
                </label>
                <input
                  type="text"
                  required
                  value={systemItemLabel}
                  onChange={(e) => setSystemItemLabel(e.target.value)}
                  placeholder="Ex: Comércio Local, Fotos, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Altera o texto exibido na barra de navegação do site.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSystemItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Salvar Rótulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(categoryToDelete)}
        title="Excluir Categoria"
        itemName={categoryToDelete?.name}
        message={
          categoryToDelete && articles.some(a => a.categoryId === categoryToDelete.id)
            ? `Esta categoria possui ${articles.filter(a => a.categoryId === categoryToDelete.id).length} matéria(s) vinculada(s). Ao excluí-la, as matérias serão mantidas e reclassificadas para a categoria principal.`
            : 'Tem certeza que deseja excluir esta categoria? O item será removido permanentemente do portal.'
        }
        confirmLabel="Sim, Excluir Categoria"
        onConfirm={executeConfirmDelete}
        onClose={() => setCategoryToDelete(null)}
      />
    </div>
  );
};
