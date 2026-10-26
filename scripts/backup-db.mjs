import fs from 'fs';
import path from 'path';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || 'sttjprycpauamxkiwqit';
const outputDir = process.env.BACKUP_OUTPUT_DIR || './backups';

if (!token) {
  console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required.');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const now = new Date();
const dateStamp = now.toISOString().replace(/[:.]/g, '-');
const readableDate = now.toUTCString();

console.log(`Starting Supabase backup for project ${ref} at ${readableDate}...`);

const query = `
SELECT
  (SELECT coalesce(json_agg(s), '[]'::json) FROM (SELECT * FROM public.seasons ORDER BY created_at) s) as seasons,
  (SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT * FROM public.teams ORDER BY name) t) as teams,
  (SELECT coalesce(json_agg(tp), '[]'::json) FROM (SELECT * FROM public.team_pins ORDER BY team_id) tp) as team_pins,
  (SELECT coalesce(json_agg(p), '[]'::json) FROM (SELECT * FROM public.players ORDER BY name) p) as players,
  (SELECT coalesce(json_agg(f), '[]'::json) FROM (SELECT * FROM public.fixtures ORDER BY match_date) f) as fixtures,
  (SELECT coalesce(json_agg(ls), '[]'::json) FROM (SELECT * FROM public.league_settings) ls) as league_settings;
`;

function sqlVal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function generateTableInserts(tableName, pkey, rows) {
  if (!rows || rows.length === 0) return `-- No records for ${tableName}\n`;
  const cols = Object.keys(rows[0]);
  const lines = [];
  lines.push(`-- Table: ${tableName} (${rows.length} records)`);
  for (const row of rows) {
    const colList = cols.join(', ');
    const valList = cols.map((col) => sqlVal(row[col])).join(', ');
    const updateList = cols
      .filter((col) => col !== pkey)
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');

    lines.push(
      `INSERT INTO public.${tableName} (${colList}) VALUES (${valList}) ON CONFLICT (${pkey}) DO UPDATE SET ${updateList};`
    );
  }
  lines.push('');
  return lines.join('\n');
}

try {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Supabase API responded with ${res.status}: ${errorText}`);
    process.exit(1);
  }

  const raw = await res.json();
  const data = Array.isArray(raw) && raw.length > 0 ? raw[0] : raw;

  const seasons = data.seasons || [];
  const teams = data.teams || [];
  const teamPins = data.team_pins || [];
  const players = data.players || [];
  const fixtures = data.fixtures || [];
  const leagueSettings = data.league_settings || [];

  console.log(`Retrieved data:
  - Seasons: ${seasons.length}
  - Teams: ${teams.length}
  - Team PINs: ${teamPins.length}
  - Players: ${players.length}
  - Fixtures: ${fixtures.length}
  - Settings: ${leagueSettings.length}`);

  // 1. Write full structured JSON backup
  const jsonFilename = path.join(outputDir, `brighton_pool_league_backup_${dateStamp}.json`);
  const fullBackupPayload = {
    metadata: {
      timestamp: now.toISOString(),
      readableDate,
      projectRef: ref,
      counts: {
        seasons: seasons.length,
        teams: teams.length,
        team_pins: teamPins.length,
        players: players.length,
        fixtures: fixtures.length,
        league_settings: leagueSettings.length,
      },
    },
    data: {
      seasons,
      teams,
      team_pins: teamPins,
      players,
      fixtures,
      league_settings: leagueSettings,
    },
  };

  fs.writeFileSync(jsonFilename, JSON.stringify(fullBackupPayload, null, 2), 'utf8');
  console.log(`Saved JSON backup: ${jsonFilename}`);

  // 2. Write executable SQL restore script
  const sqlFilename = path.join(outputDir, `brighton_pool_league_restore_${dateStamp}.sql`);
  const sqlHeader = `-- ============================================================================
-- Brighton & Hove Pool League - Automated Database Restore Script
-- Created: ${readableDate}
-- Project Ref: ${ref}
-- ============================================================================
BEGIN;

`;

  const sqlBody = [
    sqlHeader,
    generateTableInserts('league_settings', 'id', leagueSettings),
    generateTableInserts('seasons', 'id', seasons),
    generateTableInserts('teams', 'id', teams),
    generateTableInserts('team_pins', 'team_id', teamPins),
    generateTableInserts('players', 'id', players),
    generateTableInserts('fixtures', 'id', fixtures),
    'COMMIT;\n',
  ].join('\n');

  fs.writeFileSync(sqlFilename, sqlBody, 'utf8');
  console.log(`Saved SQL restore script: ${sqlFilename}`);

  // 3. Write summary file
  const summaryFilename = path.join(outputDir, `README.txt`);
  const summaryContent = `Brighton & Hove Pool League — Automated Database Backup
Generated on: ${readableDate}
Project Reference: ${ref}

Backup Contents:
- Seasons: ${seasons.length}
- Teams: ${teams.length}
- Team PINs: ${teamPins.length}
- Players: ${players.length}
- Fixtures: ${fixtures.length}
- League Settings: ${leagueSettings.length}

Restore Instructions:
- To restore via SQL: Copy and paste the contents of the .sql file directly into the Supabase SQL Editor.
- To inspect data: View the .json file in any text editor or JSON viewer.
`;
  fs.writeFileSync(summaryFilename, summaryContent, 'utf8');

  console.log('Backup completed successfully.');
} catch (err) {
  console.error('Backup failed:', err);
  process.exit(1);
}
