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

  test('completes full scorecard lifecycle: Set 1 lineup lock, frame scoring, Dish toggle, dual captain sign-off, and match submission', async ({
    page,
  }) => {
    await page.goto('/');

    // Log in as League Admin ('000000') to drive both sides of the scorecard UI
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'League Admin' }).click();
    await page.getByPlaceholder('Enter League Admin PIN').fill('000000');
    await page.getByRole('button', { name: 'Log In' }).click();

    // Navigate to Live & Fixtures, search for an unstarted 15-frame league match, and open its scorecard
    await page.getByRole('button', { name: 'Live & Fixtures' }).click();
    const searchBox = page.getByPlaceholder(
      /Search by team, venue, table, division or date/i
    );
    await searchBox.fill(isContainerized ? 'Castle Sharks' : 'Hollingbury');
    await page.getByRole('button', { name: isContainerized ? 'Upcoming' : 'Overdue', exact: true }).click();
    await page
      .getByRole('button', { name: /View Scorecard|Start Match/i })
      .first()
      .click();

    // 1. Select Home Set 1 running order (Positions 1 to 5) via UI dropdowns and click Confirm
    for (let pos = 1; pos <= 5; pos++) {
      const selectEl = page
        .locator('select')
        .filter({ hasText: `-- Select Position ${pos} Player --` })
        .first();
      const firstAvailableVal = await selectEl
        .locator('option:not([disabled]):not([value=""]):not([value="BYE"])')
        .first()
        .getAttribute('value');
      await selectEl.selectOption(firstAvailableVal!);
    }
    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();

    // Verify 1/2 confirmed state
    await expect(
      page.getByText(/lineup confirmed \(1\/2\)/i).first()
    ).toBeVisible();

    // 2. Confirm both lineups & begin match
    await page
      .getByRole('button', { name: /Admin: Confirm Both & Begin/i })
      .click();

    // 3. Score all 5 frames in Set 1 and toggle a Dish on Frame 1
    for (let frameNum = 1; frameNum <= 5; frameNum++) {
      const frameCard = page
        .locator('div')
        .filter({
          hasText: `(Frame #${frameNum})`,
          has: page.locator('button'),
        })
        .last();
      await frameCard.locator('button').first().click();
    }

    // Toggle Dish / Reverse Dish on the first frame
    const dishBtn = page
      .getByRole('button', { name: /Dish \/ Reverse Dish/i })
      .first();
    await expect(dishBtn).toBeVisible();
    await dishBtn.click();
    await expect(page.getByText('★ Dish Recorded').first()).toBeVisible();

    // 4. Advance to Set 2 and score Frames 6–10
    await page.getByRole('button', { name: /Next: Set 2/i }).click();
    for (let frameNum = 6; frameNum <= 10; frameNum++) {
      const frameCard = page
        .locator('div')
        .filter({
          hasText: `(Frame #${frameNum})`,
          has: page.locator('button'),
        })
        .last();
      await frameCard.locator('button').first().click();
    }

    // 5. Advance to Set 3 and score Frames 11–15
    await page.getByRole('button', { name: /Next: Set 3/i }).click();
    for (let frameNum = 11; frameNum <= 15; frameNum++) {
      const frameCard = page
        .locator('div')
        .filter({
          hasText: `(Frame #${frameNum})`,
          has: page.locator('button'),
        })
        .last();
      await frameCard.locator('button').first().click();
    }

    // 6. Verify completion prompt appears at bottom once all 15 frames are scored
    await expect(
      page.getByText(/Please Sign & Submit the Scorecard/i)
    ).toBeVisible();

    // 7. Sign as Home Captain, then test Unsign / Re-sign flow
    const homeSignBtn = page
      .locator('button')
      .filter({ hasText: 'Home Captain' })
      .first();
    await homeSignBtn.click();
    await expect(homeSignBtn).toContainText('✓ Signed');

    // Unsign and sign again
    await homeSignBtn.click();
    await expect(homeSignBtn).toContainText('Sign');
    await homeSignBtn.click();
    await expect(homeSignBtn).toContainText('✓ Signed');

    // 8. Sign as Away Captain -> triggers Finish & Submit Match Result modal
    const awaySignBtn = page
      .locator('button')
      .filter({ hasText: 'Away Captain' })
      .first();
    await awaySignBtn.click();

    await expect(
      page.getByRole('heading', { name: 'Finish & Submit Match Result?' })
    ).toBeVisible();

    // Confirm match submission
    await page
      .getByRole('button', { name: 'Finish & Submit Match' })
      .click();

    // Verify submitted status badges
    await expect(page.getByText('Match result submitted')).toBeVisible();
    await expect(
      page.getByText('Awaiting league admin approval')
    ).toBeVisible();
  });

  test('manages Teams, PINs, Squad Players, and Scorecard Approvals in the League Admin Portal', async ({
    page,
  }) => {
    await page.goto('/');

    // Log in as League Admin ('000000')
    await page.getByRole('button', { name: 'Login' }).click();
    await page.getByRole('button', { name: 'League Admin' }).click();
    await page.getByPlaceholder('Enter League Admin PIN').fill('000000');
    await page.getByRole('button', { name: 'Log In' }).click();

    // 1. Teams & PINs Tab: Edit a Team's 6-digit PIN and restore it
    await expect(page.getByText('King & Queen A').first()).toBeVisible();
    await page.getByRole('button', { name: 'Edit PIN' }).first().click();
    const pinInput = page.getByPlaceholder('6-digit PIN').first();
    await expect(pinInput).toBeVisible();
    await pinInput.fill('654321');
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page.getByText('654321').first()).toBeVisible();

    // Restore original PIN ('111222') so subsequent tests remain idempotent
    await page.getByRole('button', { name: 'Edit PIN' }).first().click();
    await page.getByPlaceholder('6-digit PIN').first().fill('111222');
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page.getByText('111222').first()).toBeVisible();

    // 2. Test Regenerate PIN confirmation modal (and cancel cleanly)
    await page.getByRole('button', { name: 'Regenerate' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Regenerate Team PIN?' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 3. Add a new signed-on player to the first team
    const addPlayerInput = page
      .getByPlaceholder(/Add player name/i)
      .first();
    await addPlayerInput.fill('Ronnie O-Test');
    await page.getByRole('button', { name: 'Add Player' }).first().click();
    await expect(page.getByText('Ronnie O-Test').first()).toBeVisible();

    // 4. Switch to Scorecards sub-tab and test Incomplete Scorecard warning dialog
    await page
      .getByRole('button', { name: /Scorecards/i })
      .first()
      .click();
    await page.getByRole('button', { name: /Scheduled/i }).first().click();
    await page
      .getByRole('button', { name: 'Approve', exact: true })
      .first()
      .click();

    // Verify Incomplete Scorecard Warning Modal lists missing requirements
    await expect(
      page.getByRole('heading', { name: 'Approve Incomplete Scorecard?' })
    ).toBeVisible();
    await expect(
      page.getByText(/This scorecard is not yet complete/i)
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 5. Filter by 'Awaiting Approval' and approve a completed submitted scorecard
    await page
      .getByRole('button', { name: /Awaiting Approval/i })
      .first()
      .click();
    const approveSubmittedBtn = page
      .getByRole('button', { name: 'Approve', exact: true })
      .first();
    if (await approveSubmittedBtn.isVisible()) {
      await approveSubmittedBtn.click();
      // Should approve immediately without warning modal since all 15 frames & both signatures exist
      await expect(
        page.getByRole('heading', { name: 'Approve Incomplete Scorecard?' })
      ).toBeHidden();
    }
  });

  test('filters fixtures by status/division/search and toggles Include Live & Unapproved standings', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Test search input on Live & Fixtures view
    const searchInput = page.getByPlaceholder(
      /Search by team, venue, table, division or date/i
    );
    await searchInput.fill('King & Queen');
    await expect(page.getByText('King & Queen A').first()).toBeVisible();

    // 2. Search for non-existent team and verify empty search message
    await searchInput.fill('NonExistentPoolTeamXYZ');
    await expect(
      page.getByText(/No fixtures match/i)
    ).toBeVisible();

    // Clear search
    await page.getByTitle('Clear search').click();
    await expect(searchInput).toHaveValue('');

    // 3. Test formatted empty state when filtering by status + division with 0 matches
    await page.getByRole('button', { name: 'Division 2', exact: true }).click();
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    await expect(
      page.getByText(/No ‘Live’ fixtures in ‘Division 2’/i)
    ).toBeVisible();

    // 4. Navigate to League Table and toggle 'Include Live & Unapproved'
    await page.getByRole('button', { name: 'League Table' }).click();
    const includeLiveBtn = page.getByRole('button', {
      name: /Include Live & Unapproved/i,
    });
    await expect(includeLiveBtn).toBeVisible();
    await expect(includeLiveBtn).toHaveAttribute('aria-pressed', 'false');

    await includeLiveBtn.click();
    await expect(includeLiveBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify setting persists to Player Stats view as well
    await page.getByRole('button', { name: 'Player Stats' }).click();
    const statsIncludeLiveBtn = page.getByRole('button', {
      name: /Include Live & Unapproved/i,
    });
    await expect(statsIncludeLiveBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('displays Offline Network Banner when connection drops and hides mobile bottom nav on input focus', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    // 1. Simulate browser going offline and verify NetworkStatusBanner appears
    await context.setOffline(true);
    const networkBanner = page.getByRole('complementary', {
      name: 'Network Connection Status',
    });
    await expect(networkBanner).toBeVisible();
    await expect(
      networkBanner.getByText('Offline', { exact: true })
    ).toBeVisible();
    await expect(
      networkBanner.getByText('You are currently offline.')
    ).toBeVisible();

    // 2. Restore connection and verify banner disappears automatically
    await context.setOffline(false);
    await expect(networkBanner).toBeHidden();

    // 3. Switch to mobile viewport (iPhone 14 size: 390x844) and test bottom nav hiding on input focus
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileNav = page.locator('nav.md\\:hidden');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav).toHaveAttribute('aria-hidden', 'false');

    // Focus the search input -> mobile bottom nav should hide so it doesn't cover the screen above the keyboard
    const searchInput = page.getByPlaceholder(
      /Search by team, venue, table, division or date/i
    );
    await searchInput.focus();
    await expect(mobileNav).toHaveAttribute('aria-hidden', 'true');

    // Blur the search input -> mobile bottom nav should restore after the 150ms focusout check
    await searchInput.blur();
    await expect(mobileNav).toHaveAttribute('aria-hidden', 'false', {
      timeout: 2000,
    });
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

    // 2. Private tables (team_pins, league_settings, pin_attempt_log, fixture_private_lineups) return 0 rows due to RLS
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

    const privateLineupsRes = await request.get(
      `${SUPABASE_URL}/rest/v1/fixture_private_lineups?select=*`,
      { headers }
    );
    expect(privateLineupsRes.ok()).toBeTruthy();
    expect(await privateLineupsRes.json()).toEqual([]);

    const attemptLogRes = await request.get(
      `${SUPABASE_URL}/rest/v1/pin_attempt_log?select=*`,
      { headers }
    );
    expect(attemptLogRes.ok()).toBeTruthy();
    expect(await attemptLogRes.json()).toEqual([]);

    // 3. Internal rate-limit helper functions cannot be called directly by anon
    const clearLimitRpc = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/clear_pin_rate_limit`,
      {
        headers,
        data: { p_ip: '127.0.0.1', p_action: 'admin' },
      }
    );
    expect(clearLimitRpc.status()).toBeGreaterThanOrEqual(400);

    // 4. Direct anonymous INSERT into public.teams is blocked by RLS
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

    // 5. Submitted or approved fixtures cannot be modified by Captains via RPC
    const editSubmittedRes = await request.post(
      `${SUPABASE_URL}/rest/v1/rpc/captain_save_fixture`,
      {
        headers,
        data: {
          p_fixture_id: 'fix-submitted-1',
          p_team_id: 't-prem-3',
          p_pin: '555666',
          p_status: 'live',
          p_lag_winner: 'home',
          p_home_set1_locked: true,
          p_away_set1_locked: true,
          p_lineups: {},
          p_frames: [],
          p_home_captain_signed: false,
          p_away_captain_signed: false,
          p_submitted_at: null,
          p_edited_side: 'home',
        },
      }
    );
    expect(editSubmittedRes.status()).toBeGreaterThanOrEqual(400);
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

      // 5b. Blind Set 1 Secrecy Check: Verify that querying public.fixtures via REST/DevTools while 1/2 locked
      // masks the Home Set 1 player IDs as [null,null,null,null,null] so the Away Captain cannot peek in DevTools!
      const blindCheckRes = await request.get(
        `${SUPABASE_URL}/rest/v1/fixtures?id=eq.fix-scheduled-1&select=lineups,home_set1_locked,away_set1_locked`,
        { headers }
      );
      expect(blindCheckRes.ok()).toBeTruthy();
      const [blindFixture] = await blindCheckRes.json();
      expect(blindFixture.home_set1_locked).toBe(true);
      expect(blindFixture.away_set1_locked).toBe(false);
      expect(blindFixture.lineups.set1.home).toEqual([
        null,
        null,
        null,
        null,
        null,
      ]);

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
