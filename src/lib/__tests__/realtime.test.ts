// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
// @ts-expect-error - MJS helper used for containerized Realtime WebSocket server
import { startRealtimeServer, broadcastPostgresChange } from '../../../docker/realtime-server.mjs';

describe('Supabase Realtime WebSocket Multi-Captain Sync', () => {
  it('delivers live postgres_changes WebSocket events between two captain clients', async () => {
    const port = 44329;
    const rt = startRealtimeServer(port, false);

    try {
      const clientHome = createClient(
        `http://127.0.0.1:${port}`,
        'test-anon-key',
        {
          auth: { persistSession: false },
        }
      );
      const clientAway = createClient(
        `http://127.0.0.1:${port}`,
        'test-anon-key',
        {
          auth: { persistSession: false },
        }
      );

      const receivedByAway = new Promise<Record<string, unknown>>((resolve) => {
        clientAway
          .channel('bpl-away-captain')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'fixtures' },
            (payload) => {
              resolve(payload.new as Record<string, unknown>);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Simulate Home Captain saving their Set 1 lineup to PostgreSQL
              broadcastPostgresChange(
                'fixtures',
                'UPDATE',
                {
                  id: 'fix-scheduled-1',
                  status: 'scheduled',
                  home_set1_locked: true,
                  away_set1_locked: false,
                  lineups: {
                    set1: {
                      home: ['p-kq-1', 'p-kq-2', 'p-kq-3', 'p-kq-4', 'p-kq-5'],
                      away: [null, null, null, null, null],
                    },
                  },
                },
                {
                  id: 'fix-scheduled-1',
                  status: 'scheduled',
                  home_set1_locked: false,
                  away_set1_locked: false,
                }
              );
            }
          });
      });

      const updatedFixture = await receivedByAway;
      expect(updatedFixture.id).toBe('fix-scheduled-1');
      expect(updatedFixture.home_set1_locked).toBe(true);
      expect(updatedFixture.away_set1_locked).toBe(false);

      await clientHome.removeAllChannels();
      await clientAway.removeAllChannels();
    } finally {
      await rt.close();
    }
  });
});
