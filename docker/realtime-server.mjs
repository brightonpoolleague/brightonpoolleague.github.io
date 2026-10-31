import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 4000);
const POSTGREST_URL = process.env.POSTGREST_URL || 'http://supabase-rest:3000';
const TABLES = ['fixtures', 'teams', 'players', 'seasons'];

// Active WebSocket client subscriptions
// Each entry: { socket, subscriptions: Map<topic, { joinRef, bindings: Array<{ id, event, schema, table }> }> }
const clients = new Set();

function encodeWsFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];
    const opcode = byte0 & 0x0f;
    const isMasked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    const totalFrameLen = headerLen + maskLen + payloadLen;
    if (offset + totalFrameLen > buffer.length) break;

    const payloadStart = offset + headerLen + maskLen;
    const payload = Buffer.alloc(payloadLen);
    if (isMasked) {
      const mask = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[payloadStart + i] ^ mask[i % 4];
      }
    } else {
      buffer.copy(payload, 0, payloadStart, payloadStart + payloadLen);
    }

    offset += totalFrameLen;
    if (opcode === 0x08) {
      messages.push({ type: 'close' });
    } else if (opcode === 0x01) {
      messages.push({ type: 'text', data: payload.toString('utf8') });
    }
  }

  return { messages, remaining: buffer.subarray(offset) };
}

function sendPhxMessage(socket, msgArray) {
  if (socket.destroyed || !socket.writable) return;
  try {
    socket.write(encodeWsFrame(JSON.stringify(msgArray)));
  } catch {
    // Ignore socket write errors
  }
}

function handleClientMessage(client, rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return;
  }

  // Support both v2.0.0 5-element array [join_ref, ref, topic, event, payload]
  // and v1.0.0 object { join_ref, ref, topic, event, payload }
  const isArray = Array.isArray(parsed);
  const join_ref = isArray ? parsed[0] : parsed.join_ref;
  const ref = isArray ? parsed[1] : parsed.ref;
  const topic = isArray ? parsed[2] : parsed.topic;
  const event = isArray ? parsed[3] : parsed.event;
  const payload = isArray ? parsed[4] : parsed.payload;

  if (event === 'heartbeat') {
    sendPhxMessage(client.socket, [null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]);
    return;
  }

  if (event === 'phx_join') {
    const pgChanges = payload?.config?.postgres_changes || [];

    // Emulate Supabase Realtime publication & RLS enforcement:
    // Only tables in `supabase_realtime` publication (TABLES) can be subscribed to.
    // Attempting to subscribe to private tables (e.g. `team_pins`, `league_settings`)
    // causes Supabase Realtime to reject the channel join with status: 'error'.
    const unauthorized = pgChanges.find(
      (c) => c.table && c.table !== '*' && !TABLES.includes(c.table)
    );
    if (unauthorized) {
      sendPhxMessage(client.socket, [
        join_ref,
        ref,
        topic,
        'phx_reply',
        {
          status: 'error',
          response: {
            reason: `Table '${unauthorized.table}' is not in the supabase_realtime publication or is restricted by Row-Level Security. Subscription rejected.`,
          },
        },
      ]);
      return;
    }

    const bindings = pgChanges.map((filter, idx) => ({
      ...filter,
      id: idx + 1,
    }));

    client.subscriptions.set(topic, { joinRef: join_ref, bindings });

    sendPhxMessage(client.socket, [
      join_ref,
      ref,
      topic,
      'phx_reply',
      {
        status: 'ok',
        response: {
          postgres_changes: bindings,
        },
      },
    ]);

    sendPhxMessage(client.socket, [
      join_ref,
      null,
      topic,
      'system',
      {
        status: 'ok',
        extension: 'postgres_changes',
        message: 'Subscribed to PostgreSQL',
      },
    ]);
    return;
  }

  if (event === 'phx_leave') {
    client.subscriptions.delete(topic);
    sendPhxMessage(client.socket, [join_ref, ref, topic, 'phx_reply', { status: 'ok', response: {} }]);
    return;
  }

  if (event === 'access_token') {
    sendPhxMessage(client.socket, [join_ref, ref, topic, 'phx_reply', { status: 'ok', response: {} }]);
  }
}

export function broadcastPostgresChange(table, eventType, newRecord, oldRecord) {
  const commitTimestamp = new Date().toISOString();

  for (const client of clients) {
    for (const [topic, sub] of client.subscriptions.entries()) {
      const matchingIds = sub.bindings
        .filter((b) => {
          const tableMatch = !b.table || b.table === '*' || b.table === table;
          const schemaMatch = !b.schema || b.schema === '*' || b.schema === 'public';
          const eventMatch =
            !b.event ||
            b.event === '*' ||
            b.event.toUpperCase() === eventType.toUpperCase();
          return tableMatch && schemaMatch && eventMatch;
        })
        .map((b) => b.id);

      if (matchingIds.length > 0) {
        sendPhxMessage(client.socket, [
          sub.joinRef,
          null,
          topic,
          'postgres_changes',
          {
            ids: matchingIds,
            data: {
              schema: 'public',
              table,
              commit_timestamp: commitTimestamp,
              type: eventType,
              columns: [],
              record: newRecord ?? {},
              old_record: oldRecord ?? {},
              errors: null,
            },
          },
        ]);
      }
    }
  }
}

// Track table snapshots and broadcast INSERT / UPDATE / DELETE changes in real time
const tableSnapshots = new Map();

async function pollDatabaseChanges() {
  for (const table of TABLES) {
    try {
      const res = await fetch(`${POSTGREST_URL}/${table}?select=*`);
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows)) continue;

      const currentMap = new Map();
      for (const row of rows) {
        currentMap.set(String(row.id), {
          raw: JSON.stringify(row),
          row,
        });
      }

      const prevMap = tableSnapshots.get(table);
      if (prevMap) {
        // Check INSERTs and UPDATEs
        for (const [id, curr] of currentMap.entries()) {
          const prev = prevMap.get(id);
          if (!prev) {
            broadcastPostgresChange(table, 'INSERT', curr.row, {});
          } else if (prev.raw !== curr.raw) {
            broadcastPostgresChange(table, 'UPDATE', curr.row, prev.row);
          }
        }
        // Check DELETEs
        for (const [id, prev] of prevMap.entries()) {
          if (!currentMap.has(id)) {
            broadcastPostgresChange(table, 'DELETE', {}, { id: prev.row.id });
          }
        }
      }

      tableSnapshots.set(table, currentMap);
    } catch {
      // Ignore transient poll errors while PostgREST is booting
    }
  }
}

export function startRealtimeServer(port = PORT, startPolling = true) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n',
      ].join('\r\n')
    );

    const client = {
      socket,
      subscriptions: new Map(),
    };
    clients.add(client);

    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const { messages, remaining } = decodeWsFrames(buffer);
      buffer = remaining;
      for (const msg of messages) {
        if (msg.type === 'close') {
          socket.end();
          clients.delete(client);
          return;
        }
        if (msg.type === 'text') {
          handleClientMessage(client, msg.data);
        }
      }
    });

    socket.on('close', () => clients.delete(client));
    socket.on('error', () => clients.delete(client));
  });

  let pollTimer = null;
  if (startPolling) {
    pollTimer = setInterval(pollDatabaseChanges, 150);
  }

  server.listen(port);
  return {
    server,
    close: () => {
      if (pollTimer) clearInterval(pollTimer);
      for (const c of clients) c.socket.destroy();
      clients.clear();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  startRealtimeServer(PORT, true);
  console.log(`Supabase Realtime WebSocket server listening on port ${PORT}`);
}
