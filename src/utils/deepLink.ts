export type DeepLinkTab =
  | 'fixtures'
  | 'table'
  | 'teams'
  | 'stats'
  | 'info'
  | 'admin';

const VALID_TABS = new Set<string>([
  'fixtures',
  'table',
  'teams',
  'stats',
  'info',
  'admin',
]);

export function slugifyDivision(division: string): string {
  return division
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getUrlTab(search?: string): DeepLinkTab | null {
  if (typeof window === 'undefined' && search === undefined) return null;
  const tab = new URLSearchParams(search ?? window.location.search)
    .get('tab')
    ?.trim()
    .toLowerCase();
  return tab && VALID_TABS.has(tab) ? (tab as DeepLinkTab) : null;
}

export function getUrlDivision(
  expectedTab: DeepLinkTab,
  divisions: string[],
  allowKnockout = false,
  search?: string
): string | null {
  if (typeof window === 'undefined' && search === undefined) return null;
  const params = new URLSearchParams(search ?? window.location.search);
  const urlTab = getUrlTab(search);
  if (urlTab && urlTab !== expectedTab) return null;

  const rawDiv = params.get('division')?.trim();
  if (!rawDiv) return null;

  const slug = slugifyDivision(rawDiv);
  if (allowKnockout && slug === 'knockout') return 'KNOCKOUT';

  return (
    divisions.find(
      (d) => d.toLowerCase() === rawDiv.toLowerCase() || slugifyDivision(d) === slug
    ) ?? null
  );
}

export function updateUrlDeepLink(
  tab: DeepLinkTab,
  division?: string | null
): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  const divSlug = division ? slugifyDivision(division) : null;
  const isDefaultHome = tab === 'fixtures' && (!divSlug || divSlug === 'all');

  if (!isDefaultHome) {
    params.set('tab', tab);
    if (
      divSlug &&
      (tab === 'table' ||
        tab === 'stats' ||
        (tab === 'fixtures' && divSlug !== 'all'))
    ) {
      params.set('division', divSlug);
    }
  }

  const query = params.toString();
  const basePath = window.location.pathname || '/';
  const nextUrl = query ? `${basePath}?${query}` : basePath;
  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}
