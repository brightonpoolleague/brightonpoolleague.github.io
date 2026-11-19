import { beforeEach, describe, expect, it } from 'vitest';
import {
  getUrlDivision,
  getUrlTab,
  slugifyDivision,
  updateUrlDeepLink,
} from '../deepLink';

describe('deepLink utility', () => {
  const divisions = [
    'Premier League',
    'Division 1',
    'Division 2',
    'Division 3',
  ];

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('slugifies standard and future division names cleanly', () => {
    expect(slugifyDivision('Premier League')).toBe('premier-league');
    expect(slugifyDivision('Division 3')).toBe('division-3');
    expect(slugifyDivision('Division 4')).toBe('division-4');
  });

  it('parses tab and division query parameters including dynamic future divisions', () => {
    expect(getUrlTab('?tab=table&division=division-3')).toBe('table');
    expect(getUrlTab('?tab=info')).toBe('info');
    expect(getUrlTab('')).toBeNull();

    expect(
      getUrlDivision('table', divisions, false, '?tab=table&division=division-3')
    ).toBe('Division 3');
    expect(
      getUrlDivision(
        'fixtures',
        [...divisions, 'Division 4'],
        true,
        '?tab=fixtures&division=division-4'
      )
    ).toBe('Division 4');
    expect(
      getUrlDivision(
        'fixtures',
        divisions,
        true,
        '?tab=fixtures&division=knockout'
      )
    ).toBe('KNOCKOUT');
  });

  it('updates browser URL query parameters and cleans root fixtures URL', () => {
    updateUrlDeepLink('table', 'Division 3');
    expect(window.location.search).toBe('?tab=table&division=division-3');

    updateUrlDeepLink('fixtures', 'Division 3');
    expect(window.location.search).toBe('?tab=fixtures&division=division-3');

    updateUrlDeepLink('fixtures', 'ALL');
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
  });
});
