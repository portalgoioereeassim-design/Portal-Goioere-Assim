/**
 * Utilitário para formatar matérias preservando rigorosamente
 * todas as quebras de linha, espaços, parágrafos, negrito (** ou <strong>),
 * caixa alta (UPPERCASE) e fontes personalizadas (serif, sans, mono, times).
 */

export function formatArticleContent(raw: string): string {
  if (!raw) return '';

  // 1. Normalizar quebras de linha Windows (\r\n) e Mac antigo (\r)
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Preservar espaços no início das linhas (recuo / indentação de parágrafo)
  text = text.replace(/^ +/gm, (match) => '&nbsp;'.repeat(match.length));

  // 3. Preservar múltiplos espaços consecutivos no meio do texto
  text = text.replace(/ {2,}/g, (match) => {
    return ' ' + '&nbsp;'.repeat(match.length - 1);
  });

  // 4. Converter tags de Negrito (Markdown **texto** ou __texto__ e HTML <b>/<strong>)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong class="font-bold text-slate-900">$1</strong>');
  text = text.replace(/<(?:b|strong)>(.*?)<\/(?:b|strong)>/gi, '<strong class="font-bold text-slate-900">$1</strong>');

  // 5. Converter tags de Itálico (Markdown *texto* ou _texto_ e HTML <i>/<em>)
  text = text.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
  text = text.replace(/(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g, '<em class="italic">$1</em>');
  text = text.replace(/<(?:i|em)>(.*?)<\/(?:i|em)>/gi, '<em class="italic">$1</em>');

  // 6. Converter Caixa Alta personalizada: [upper]texto[/upper] ou [caps]texto[/caps] ou [caixa-alta]texto[/caixa-alta]
  text = text.replace(/\[(?:upper|caps|caixa-alta)\](.*?)\[\/(?:upper|caps|caixa-alta)\]/gi, '<span class="uppercase font-semibold tracking-wide">$1</span>');

  // 7. Converter tags de Fonte personalizada: [serif]...[/serif], [mono]...[/mono], [sans]...[/sans], [times]...[/times]
  text = text.replace(/\[serif\](.*?)\[\/serif\]/gi, '<span class="article-font-serif font-serif">$1</span>');
  text = text.replace(/\[sans\](.*?)\[\/sans\]/gi, '<span class="article-font-sans font-sans">$1</span>');
  text = text.replace(/\[mono\](.*?)\[\/mono\]/gi, '<span class="article-font-mono font-mono bg-slate-100 px-1 py-0.5 rounded text-[0.9em]">$1</span>');
  text = text.replace(/\[times\](.*?)\[\/times\]/gi, '<span class="article-font-times font-times">$1</span>');
  text = text.replace(/\[font=(serif|sans|mono|times)\](.*?)\[\/font\]/gi, '<span class="article-font-$1 font-$1">$2</span>');

  // 8. Converter Subtítulos (## e ###)
  text = text.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl sm:text-2xl font-bold text-slate-900 mt-7 mb-3 leading-snug">$1</h2>');
  text = text.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg sm:text-xl font-bold text-slate-800 mt-5 mb-2 leading-snug">$1</h3>');

  // 9. Converter Citações (> frase)
  text = text.replace(/^>\s*"?([^"\n]+)"?$/gm, '<blockquote class="border-l-4 border-red-600 pl-4 py-2.5 my-5 italic text-slate-700 bg-slate-50/90 rounded-r-xl font-medium shadow-2xs">"$1"</blockquote>');

  // 10. Converter Marcadores de Lista (• item ou - item ou * item)
  text = text.replace(/^[•\-\*]\s+(.+)$/gm, '<div class="flex items-start gap-2.5 my-2 pl-2 text-slate-800 leading-relaxed"><span class="text-red-600 font-bold text-base leading-none mt-1 select-none">•</span><span class="flex-1">$1</span></div>');

  // 11. Links automáticos (URLs que não estejam já dentro de tags href)
  text = text.replace(/(https?:\/\/[^\s<"']+)(?![^<]*>|[^<>]*<\/a>)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-red-600 underline font-medium hover:text-red-700 break-all">$1</a>');

  // 12. Se o conteúdo já foi salvo como HTML contendo múltiplos <p>
  const hasMultipleP = (text.match(/<p[^>]*>/gi) || []).length >= 2;
  if (hasMultipleP) {
    return text.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (_, attrs, inner) => {
      const withBr = inner.replace(/\n/g, '<br />');
      const classAttr = attrs.includes('class=') ? attrs : ` class="mb-5 leading-relaxed text-slate-800"${attrs}`;
      return `<p${classAttr}>${withBr}</p>`;
    });
  }

  // 13. Modo Padrão: Processar blocos separados por quebras de linha duplas (\n\n)
  // Se houver 3 ou mais \n consecutivos, preservamos o espaçamento vertical extra adicionado pelo autor!
  const rawSections = text.split('\n\n');
  const renderedSections: string[] = [];

  for (let i = 0; i < rawSections.length; i++) {
    const rawBlock = rawSections[i];
    const trimmed = rawBlock.trim();

    if (!trimmed) {
      // Bloco em branco intencional (espaçamento vertical extra entre parágrafos)
      renderedSections.push('<div class="h-6 sm:h-8" aria-hidden="true"></div>');
      continue;
    }

    // Se o bloco já for um elemento HTML de nível de bloco
    if (/^<(h[1-6]|blockquote|div|ul|ol|table|figure|p)[^>]*>/i.test(trimmed)) {
      renderedSections.push(trimmed);
      continue;
    }

    // Preservar rigorosamente todas as quebras de linha únicas (\n) como <br />
    const withBr = rawBlock.replace(/\n/g, '<br />');
    renderedSections.push(`<p class="mb-5 leading-relaxed text-slate-800">${withBr}</p>`);
  }

  return renderedSections.join('\n');
}
