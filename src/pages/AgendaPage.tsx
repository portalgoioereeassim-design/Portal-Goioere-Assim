import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Globe, 
  ExternalLink, 
  MessageCircle, 
  Search, 
  X, 
  Sparkles,
  Clock,
  Ticket
} from 'lucide-react';
import { EventAgendaItem } from '../types';
import { storageService } from '../services/storageService';

export const AgendaPage: React.FC = () => {
  const [items, setItems] = useState<EventAgendaItem[]>(() => 
    storageService.getEventAgenda().filter(i => i.active !== false)
  );
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    const handleUpdate = () => {
      setItems(storageService.getEventAgenda().filter(i => i.active !== false));
    };
    window.addEventListener('portal_data_updated', handleUpdate);
    return () => window.removeEventListener('portal_data_updated', handleUpdate);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(q) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const formatEventDateTime = (dateStr: string) => {
    try {
      if (dateStr.includes('T')) {
        const [d, t] = dateStr.split('T');
        const [year, month, day] = d.split('-');
        return `${day}/${month}/${year} às ${t || '20:00'}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getCleanPhone = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Programação Cultural & Festas</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Agenda de Eventos
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Fique por dentro de todos os shows, festas, encontros culturais, esportes e grandes eventos que agitam nossa cidade e região.
          </p>
        </div>

        {/* Search */}
        <div className="mt-6 max-w-md relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por evento, show ou data..."
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

      {/* Events Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
          <h3 className="text-base font-bold text-slate-700">Nenhum evento encontrado</h3>
          <p className="text-xs">Não há eventos agendados para a busca informada no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((event) => {
            const cleanPhone = getCleanPhone(event.contact);
            const whatsappLink = cleanPhone 
              ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o evento "${event.name}".`)}`
              : null;

            return (
              <article
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Event Banner */}
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={event.bannerUrl}
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {event.featured && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Destaque</span>
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="p-5 space-y-3">
                    {/* Date and Time Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
                      <Clock className="w-3.5 h-3.5 text-red-600" />
                      <span>{formatEventDateTime(event.date)}</span>
                    </div>

                    <h3 className="font-bold text-lg text-slate-900 leading-snug group-hover:text-red-600 transition-colors">
                      {event.name}
                    </h3>

                    {event.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    {/* Contact info box */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold truncate">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{event.contact}</span>
                      </div>

                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Site Link Button */}
                <div className="p-5 pt-0 border-t border-slate-100 mt-2">
                  {event.siteLink ? (
                    <a
                      href={event.siteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-3 py-2.5 px-4 bg-slate-900 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Visitar Site do Evento / Ingressos</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="mt-3 py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-center text-xs">
                      Entrada / Acesso no local do evento
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
