/**
 * Utilitários seguros para formatação de data e hora sem risco de lançar exceções.
 */

export function parseSafeDate(dateInput?: string | number | Date | null): Date | null {
  if (!dateInput) return null;
  try {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatArticleDate(
  dateInput?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseSafeDate(dateInput);
  if (!d) return '';

  try {
    const defaultOpts: Intl.DateTimeFormatOptions = options || {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };
    return new Intl.DateTimeFormat('pt-BR', defaultOpts).format(d);
  } catch {
    return '';
  }
}

export function formatArticleFullDate(dateInput?: string | number | Date | null): string {
  const d = parseSafeDate(dateInput);
  if (!d) return 'Recentemente';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return 'Recentemente';
  }
}

export function formatArticleTime(dateInput?: string | number | Date | null): string {
  const d = parseSafeDate(dateInput);
  if (!d) return '';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

export function formatShortAdminDate(dateInput?: string | number | Date | null): string {
  const d = parseSafeDate(dateInput);
  if (!d) return '-';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(d);
  } catch {
    return '-';
  }
}
