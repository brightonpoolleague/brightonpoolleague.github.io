import { test, expect } from '@playwright/test';

const isContainerized = process.env.CI_CONTAINERIZED === 'true';
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

test.describe('Brighton & Hove Pool League - Headless Browser E2E Suite', () => {
  test('loads the main application shell and navigates across all public views', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Verify Top Brand Header
    await expect(
      page.getByText('Brighton & Hove Pool League').first()
    ).toBeVisible();

    // 2. Navigate to League Table
    await page.getByRole('button', { name: 'League Table' }).click();
    await expect(
      page.getByRole('heading', { name: 'League Tables' })
    ).toBeVisible();

    // 3. Navigate to Player Stats
    await page.getByRole('button', { name: 'Player Stats' }).click();
    await expect(page.getByText(/Player Stats/i).first()).toBeVisible();

    // 4. Navigate to Teams & Venues
    await page.getByRole('button', { name: 'Teams & Venues' }).click();
    await expect(page.getByText('The King & Queen').first()).toBeVisible();

    // 5. Navigate to Rules & Info
    await page.getByRole('button', { name: 'Rules & Info' }).click();
    await expect(page.getByText(/League Rules|League Format/i).first()).toBeVisible();

    // 6. Return to Live & Fixtures and open a Match Scorecard Modal
    await page.getByRole('button', { name: 'Live & Fixtures' }).click();
    const viewScorecardBtn = page.getByRole('button', { name: /View Scorecard/i }).first();
    await expect(viewScorecardBtn).toBeVisible();
    await viewScorecardBtn.click();

    // Verify scorecard modal displays Set 1 / Set 2 / Set 3
    await expect(page.getByText('Set 1').first()).toBeVisible();
    await expect(page.getByText('Set 2').first()).toBeVisible();
    await expect(page.getByText('Set 3').first()).toBeVisible();
  });

  test('validates Team Captain login with 6-digit PIN and activates Captain session', async ({
    page,
  }) => {
    await page.goto('/');

    // Open Login Modal
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(
      page.getByPlaceholder('Enter 6-digit Team PIN')
    ).toBeVisible();

    // Test invalid PIN rejection first
    await page.getByPlaceholder('Enter 6-digit Team PIN').fill('999999');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(
      page.getByText(/Incorrect Team PIN/i)
    ).toBeVisible();

    // Test valid Captain PIN ('111222' -> King & Queen A)
    await page.getByPlaceholder('Enter 6-digit Team PIN').fill('111222');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Verify Active Session Bar & Log Out button
    await expect(page.getByText('Captain').first()).toBeVisible();
    await expect(page.getByText('King & Queen A').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible();

    // Log out cleanly
    await page.getByRole('button', { name: 'Log Out' }).click();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('authenticates League Admin via PIN and navigates to the League Admin Portal', async ({
    page,
  }) => {
    await page.goto('/');

    // Open Login Modal & switch to League Admin tab
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'League Admin' }).click();

    const adminInput = page.getByPlaceholder('Enter League Admin PIN');
    await expect(adminInput).toBeVisible();

    // Log in with Admin PIN ('000000')
    await adminInput.fill('000000');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Verify automatic redirection to League Admin portal & active session badge
    await expect(page.getByText('League Admin').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible();

    // Verify Admin Portal sections exist
    await expect(page.getByText('King & Queen A').first()).toBeVisible();
  });
});

test.describe('Containerized Supabase & PostgreSQL Database E2E Suite', () => {
  test.skip(
    !isContainerized,
    'Runs in containerized Docker environment with real Supabase PostgreSQL & PostgREST'
  );

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  test('enforces PostgreSQL Row-Level Security (public read-only, private PIN tables blocked)', async ({
    request,
  }) => {
    // 1. Public tables (seasons, teams, players, fixtures) are readable by anon
    const teamsRes = await request.get(`${SUPABASE_URL}/rest/v1/teams?select=*`, {
      headers,
    });
    expect(teamsRes.ok()).toBeTruthy();
    const teams = await teamsRes.json();
    expect(teams.length).toBeGreaterThanOrEqual(4);
    expect(teams.some((t: { name: string }) => t.name === 'King & Queen A')).toBe(
      true
    );

    // 2. Private tables (team_pins, league_settings) return 0 rows due to RLS
    const pinsRes = await request.get(
      `${SUPABASE_URL}/rest/v1/team_pins?select=*`,
      { headers }
    );
    expect(pinsRes.ok()).toBeTruthy();
    const leakedPins = await pinsRes.json();
    expect(leakedPins).toEqual([]);

    const settingsRes = await request.get(
      `${SUPABASE_URL}/rest/v1/league_settings?select=*`,
      { headers }
    );
    expect(settingsRes.ok()).toBeTruthy();
    const leakedSettings = await settingsRes.json();
    expect(leakedSettings).toEqual([]);

    // 3. Direct anonymous INSERT into public.teams is blocked by RLS
    const unauthInsert = await request.post(`${SUPABASE_URL}/rest/v1/teams`, {
      headers,
      data: {
        id: 'hacked-team',
        season_id: 'winter-2026-27',
        division: 'Premier League',
        name: 'Unauthorized Team',
        venue: 'Nowhere',
      },
    });
    expect(unauthInsert.status()).toBeGreaterThanOrEqual(400);
  });

  test('verifies server-side PIN RPCs and syncs real database changes to the browser UI', async ({
    request,
    page,
  }) => {
    // 1. Verify Captain login RPC against real PostgreSQL
    const captainRpc = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/login_captain_with_pin`,
      {
        headers,
        data: { p_pin: '111222' },
      }
    );
    expect(captainRpc.ok()).toBeTruthy();
    const captainData = await captainRpc.json();
    expect(captainData).toEqual([
      { team_id: 't-prem-1', team_name: 'King & Queen A' },
    ]);

    // 2. Verify Admin PIN RPC against real PostgreSQL
    const adminValidRpc = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/verify_admin_pin`,
      {
        headers,
        data: { p_pin: '000000' },
      }
    );
    expect(await adminValidRpc.json()).toBe(true);

    // 3. Fetch protected team PINs via Admin RPC
    const allPinsRpc = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/get_all_team_pins`,
      {
        headers,
        data: { p_admin_pin: '000000' },
      }
    );
    expect(allPinsRpc.ok()).toBeTruthy();
    const allPins = await allPinsRpc.json();
    expect(allPins).toHaveLength(4);

    // 4. Create a brand new team via Admin RPC in PostgreSQL and verify it renders in the live browser!
    const upsertTeamRpc = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/admin_upsert_team`,
      {
        headers,
        data: {
          p_admin_pin: '000000',
          p_id: 't-prem-docker-e2e',
          p_season_id: 'winter-2026-27',
          p_division: 'Premier League',
          p_name: 'Docker Harbor Cruisers',
          p_venue: 'Brighton Marina Tavern',
          p_address: '12 Marina Square, Brighton',
          p_captain_name: 'Alex Docker',
          p_captain_pin: '888999',
          p_table_number: 'Table 4',
        },
      }
    );
    expect(upsertTeamRpc.ok()).toBeTruthy();
    expect(await upsertTeamRpc.json()).toBe(true);

    // 5. Open headless Chromium against the containerized app and verify the new database team appears in League Table & Venues!
    await page.goto('/');
    await page.getByRole('button', { name: 'League Table' }).click();
    await expect(page.getByText('Docker Harbor Cruisers')).toBeVisible();

    await page.getByRole('button', { name: 'Teams & Venues' }).click();
    await expect(page.getByText('Brighton Marina Tavern')).toBeVisible();
  });

  test('synchronizes live scorecard updates over WebSockets between two captains on separate browsers', async ({
    browser,
    request,
  }) => {
    // Spawn two independent browser contexts (simulating two captains on separate phones)
    const homeContext = await browser.newContext();
    const awayContext = await browser.newContext();
    const homePage = await homeContext.newPage();
    const awayPage = await awayContext.newPage();

    try {
      // 1. Home Captain ('111222' - King & Queen A) logs in on Browser 1
      await homePage.goto('/');
      await homePage.getByRole('button', { name: 'Login' }).click();
      await homePage.getByPlaceholder('Enter 6-digit Team PIN').fill('111222');
      await homePage.getByRole('button', { name: 'Log In' }).click();
      await expect(homePage.getByText('King & Queen A').first()).toBeVisible();

      // 2. Away Captain ('555666' - Caroline Cueists) logs in on Browser 2
      await awayPage.goto('/');
      await awayPage.getByRole('button', { name: 'Login' }).click();
      await awayPage.getByPlaceholder('Enter 6-digit Team PIN').fill('555666');
      await awayPage.getByRole('button', { name: 'Log In' }).click();
      await expect(awayPage.getByText('Caroline Cueists').first()).toBeVisible();

      // 3. Both captains open the scheduled match (King & Queen A vs Caroline Cueists) simultaneously
      await homePage.getByRole('button', { name: 'Start Match' }).first().click();
      await awayPage.getByRole('button', { name: 'Start Match' }).first().click();

      // 4. Home Captain submits & locks their Set 1 lineup (side='home') via PostgreSQL RPC
      const homeSaveRes = await request.post(
        `${SUPABASE_URL}/rest/v1/rpc/captain_save_fixture`,
        {
          headers,
          data: {
            p_fixture_id: 'fix-scheduled-1',
            p_team_id: 't-prem-1',
            p_pin: '111222',
            p_status: 'scheduled',
            p_lag_winner: 'home',
            p_home_set1_locked: true,
            p_away_set1_locked: false,
            p_lineups: {
              set1: {
                home: ['p-kq-1', 'p-kq-2', 'p-kq-3', 'p-kq-4', 'p-kq-5'],
                away: [null, null, null, null, null],
              },
              set2: {
                home: ['p-kq-1', 'p-kq-2', 'p-kq-3', 'p-kq-4', 'p-kq-5'],
                away: [null, null, null, null, null],
              },
              set3: {
                home: ['p-kq-1', 'p-kq-2', 'p-kq-3', 'p-kq-4', 'p-kq-5'],
                away: [null, null, null, null, null],
              },
            },
            p_frames: [],
            p_home_captain_signed: false,
            p_away_captain_signed: false,
            p_submitted_at: null,
            p_edited_side: 'home',
          },
        }
      );
      expect(homeSaveRes.ok()).toBeTruthy();

      // 5. Verify Away Captain's browser (Browser 2) receives the live WebSocket update WITHOUT page reload!
      await expect(
        awayPage.getByText(/lineup confirmed \(1\/2\)/i).first()
      ).toBeVisible({ timeout: 10_000 });

      // 6. Away Captain now submits & locks their Set 1 lineup (side='away')
      const awaySaveRes = await request.post(
        `${SUPABASE_URL}/rest/v1/rpc/captain_save_fixture`,
        {
          headers,
          data: {
            p_fixture_id: 'fix-scheduled-1',
            p_team_id: 't-prem-3',
            p_pin: '555666',
            p_status: 'live',
            p_lag_winner: 'home',
            p_home_set1_locked: false, // Server-side merge preserves Home's lock!
            p_away_set1_locked: true,
            p_lineups: {
              set1: {
                home: [null, null, null, null, null],
                away: ['p-cc-1', 'p-cc-2', 'p-cc-3', 'p-cc-4', 'p-cc-5'],
              },
              set2: {
                home: [null, null, null, null, null],
                away: ['p-cc-1', 'p-cc-2', 'p-cc-3', 'p-cc-4', 'p-cc-5'],
              },
              set3: {
                home: [null, null, null, null, null],
                away: ['p-cc-1', 'p-cc-2', 'p-cc-3', 'p-cc-4', 'p-cc-5'],
              },
            },
            p_frames: [],
            p_home_captain_signed: false,
            p_away_captain_signed: false,
            p_submitted_at: null,
            p_edited_side: 'away',
          },
        }
      );
      expect(awaySaveRes.ok()).toBeTruthy();

      // 7. Verify BOTH browsers receive the WebSocket update and reveal all Set 1 player names live!
      await expect(homePage.getByText('Chloe Mercer').first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(awayPage.getByText('Sam Carter').first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await homeContext.close();
      await awayContext.close();
    }
  });
});
