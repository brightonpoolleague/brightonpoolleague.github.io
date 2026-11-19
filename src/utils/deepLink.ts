export type DeepLinkTab =
  | 'fixtures'
  | 'table'
  | 'teams'
  | 'stats'
  | 'rules'
  | 'admin';

const VALID_TABS: Set<string> = new Set([
  'fixtures',
  'table',
  'teams',
  'stats',
  'rules',
  'admin',
]);

/**
 * Converts a division display name (e.g. "Division 3" or "Premier League")
 * into a URL-friendly slug (e.g. "division-3" or "premier-league").
 */
export function slugifyDivision(division: string): string {
  const trimmed = division.trim();
  if (trimmed.toUpperCase() === 'ALL') return 'all';
  if (trimmed.toUpperCase() === 'KNOCKOUT') return 'knockout';
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves a `division` query parameter against the active list of divisions.
 * Dynamically supports any future divisions added to a season.
 */
export function resolveDivisionFromSlug(
  slug: string | null | undefined,
  divisions: string[],
  options?: { allowAll?: boolean; allowKnockout?: boolean }
): string | null {
  if (!slug) return null;
  const raw = slug.trim();
  if (!raw) return null;

  const normalized = slugifyDivision(raw);

  if (options?.allowAll && normalized === 'all') {
    return 'ALL';
  }

  if (options?.allowKnockout && normalized === 'knockout') {
    return 'KNOCKOUT';
  }

  for (const div of divisions) {
    if (
      div.toLowerCase() === raw.toLowerCase() ||
      slugifyDivision(div) === normalized
    ) {
      return div;
    }
  }

  return null;
}

/**
 * Reads `tab` and `division` from URL query parameters (`?tab=table&division=division-3`).
 */
export function parseUrlDeepLink(search?: string): {
  tab: DeepLinkTab | null;
  divisionSlug: string | null;
} {
  if (typeof window === 'undefined' && search === undefined) {
    return { tab: null, divisionSlug: null };
  }
  const searchParams = new URLSearchParams(
    search ?? window.location.search
  );
  const rawTab = searchParams.get('tab')?.trim().toLowerCase() ?? null;
  const tab =
    rawTab && VALID_TABS.has(rawTab) ? (rawTab as DeepLinkTab) : null;
  const divisionSlug = searchParams.get('division')?.trim() || null;

  return { tab, divisionSlug };
}

/**
 * Syncs `tab` and `division` query parameters (`?tab=...&division=...`)
 * in the browser address bar via `history.replaceState`.
 */
export function updateUrlDeepLink(params: {
  tab: DeepLinkTab;
  division?: string | null;
}): void {
  if (typeof window === 'undefined') return;

  const { tab, division } = params;
  const searchParams = new URLSearchParams();
  const divSlug = division ? slugifyDivision(division) : null;
  const isDefaultFixturesView =
    tab === 'fixtures' && (!divSlug || divSlug === 'all');

  if (!isDefaultFixturesView) {
    searchParams.set('tab', tab);
    if (
      divSlug &&
      (tab === 'table' ||
        tab === 'stats' ||
        (tab === 'fixtures' && divSlug !== 'all'))
    ) {
      searchParams.set('division', divSlug);
    }
  }

  const query = searchParams.toString();
  const basePath = window.location.pathname || '/';
  const nextUrl = query ? `${basePath}?${query}` : basePath;
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (currentUrl !== nextUrl) {
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {
      // ignore SecurityError in restricted environments
    }
  }
}
