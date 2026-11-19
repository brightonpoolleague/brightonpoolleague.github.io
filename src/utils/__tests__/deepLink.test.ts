import { beforeEach, describe, expect, it } from 'vitest';
import {
  parseUrlDeepLink,
  resolveDivisionFromSlug,
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
    expect(slugifyDivision('ALL')).toBe('all');
    expect(slugifyDivision('KNOCKOUT')).toBe('knockout');
  });

  it('resolves division query parameters including dynamic future divisions', () => {
    expect(resolveDivisionFromSlug('division-3', divisions)).toBe('Division 3');
    expect(resolveDivisionFromSlug('Division 3', divisions)).toBe('Division 3');
    expect(resolveDivisionFromSlug('premier-league', divisions)).toBe(
      'Premier League'
    );

    const futureDivisions = [...divisions, 'Division 4'];
    expect(resolveDivisionFromSlug('division-4', futureDivisions)).toBe(
      'Division 4'
    );

    expect(
      resolveDivisionFromSlug('all', divisions, { allowAll: true })
    ).toBe('ALL');
    expect(
      resolveDivisionFromSlug('knockout', divisions, { allowKnockout: true })
    ).toBe('KNOCKOUT');
  });

  it('parses tab and division query parameters', () => {
    expect(parseUrlDeepLink('?tab=table&division=division-3')).toEqual({
      tab: 'table',
      divisionSlug: 'division-3',
    });

    expect(parseUrlDeepLink('?tab=fixtures&division=division-2')).toEqual({
      tab: 'fixtures',
      divisionSlug: 'division-2',
    });

    expect(parseUrlDeepLink('')).toEqual({
      tab: null,
      divisionSlug: null,
    });
  });

  it('updates browser URL query parameters and cleans root fixtures URL', () => {
    updateUrlDeepLink({ tab: 'table', division: 'Division 3' });
    expect(window.location.search).toBe('?tab=table&division=division-3');

    updateUrlDeepLink({ tab: 'fixtures', division: 'Division 3' });
    expect(window.location.search).toBe('?tab=fixtures&division=division-3');

    updateUrlDeepLink({ tab: 'fixtures', division: 'ALL' });
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
  });
});
