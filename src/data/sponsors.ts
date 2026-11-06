export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  role?: string;
  tagline?: string;
  url?: string;
}

export const LEAGUE_SPONSORS: Sponsor[] = [
  {
    id: 'ks-print',
    name: 'KS Print',
    logo: 'sponsors/ks-print.png',
    role: 'Official League Sponsor',
    tagline: 'Proud sponsor of the Brighton & Hove Pool League',
    url: 'https://www.ks-print.co.uk/',
  },
];

export const PRIMARY_SPONSOR: Sponsor = LEAGUE_SPONSORS[0];
