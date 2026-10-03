import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { BuzzerButton, Player, PlayerInputState, RoomState, WSMessage, HostNetworkInterface, NetworkInfoResponse } from './src/types.ts';

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

interface ClientConnection {
  ws: WebSocket;
  roomId: string;
  role: 'host' | 'player';
  playerId: string;
}

const connections = new Map<WebSocket, ClientConnection>();
const rooms = new Map<string, RoomState>();
const playerDisconnectTimers = new Map<string, NodeJS.Timeout>();

const DEFAULT_PLAYER_COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f97316', // Orange
];

function createDefaultPlayer(id: string, slot: number, name?: string): Player {
  return {
    id,
    slot,
    name: name || `Player ${slot}`,
    color: DEFAULT_PLAYER_COLORS[(slot - 1) % DEFAULT_PLAYER_COLORS.length],
    connected: true,
    ping: 0,
    inputs: {
      red: false,
      blue: false,
      orange: false,
      green: false,
      yellow: false,
    },
    score: 0,
    lastBuzzedAt: null,
    buzzRank: null,
    lockedOut: false,
    selectedChoice: null,
  };
}

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      status: 'idle',
      armedAt: null,
      buzzerOrder: [],
      players: {},
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(roomId: string, message: WSMessage) {
  const payload = JSON.stringify(message);
  connections.forEach((conn) => {
    if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(payload);
      } catch (e) {
        console.error('Error broadcasting to connection', e);
      }
    }
  });
}

function getNextAvailableSlot(room: RoomState, requested?: number, currentPlayerId?: string): number {
  const occupiedSlots = new Set<number>();
  Object.values(room.players).forEach((p) => {
    if (p.id !== currentPlayerId && p.connected) {
      occupiedSlots.add(p.slot);
    }
  });

  if (requested && requested >= 1 && requested <= 8 && !occupiedSlots.has(requested)) {
    return requested;
  }

  for (let i = 1; i <= 8; i++) {
    if (!occupiedSlots.has(i)) {
      return i;
    }
  }
  return 1;
}

// WebSocket handler
wss.on('connection', (ws: WebSocket) => {
  let clientConn: ClientConnection | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString()) as WSMessage;

      if (data.type === 'join') {
        const roomId = (data.roomId || 'BUZZ1').toUpperCase().trim();
        const room = getOrCreateRoom(roomId);

        if (data.role === 'host') {
          clientConn = { ws, roomId, role: 'host', playerId: 'host' };
          connections.set(ws, clientConn);

          ws.send(
            JSON.stringify({
              type: 'joined',
              playerId: 'host',
              slot: 0,
              role: 'host',
              roomState: room,
            })
          );
        } else {
          // Player joining from phone
          const existingPid = data.existingPlayerId;
          let player: Player;
          let playerId: string;

          // Clear any pending disconnect timer for reconnecting player
          if (existingPid && playerDisconnectTimers.has(existingPid)) {
            clearTimeout(playerDisconnectTimers.get(existingPid)!);
            playerDisconnectTimers.delete(existingPid);
          }

          if (existingPid && room.players[existingPid]) {
            // Reconnecting existing player - restore session and slot!
            playerId = existingPid;
            player = room.players[existingPid];
            player.connected = true;

            // If a requested slot is given and available, update it
            if (data.requestedSlot && data.requestedSlot >= 1 && data.requestedSlot <= 8) {
              const isTaken = Object.values(room.players).some(
                (p) => p.id !== playerId && p.slot === data.requestedSlot && p.connected
              );
              if (!isTaken) {
                player.slot = data.requestedSlot;
                player.color = DEFAULT_PLAYER_COLORS[(player.slot - 1) % DEFAULT_PLAYER_COLORS.length];
              }
            }

            if (data.name) {
              player.name = data.name.trim().substring(0, 20);
            }
          } else {
            // New player
            playerId = existingPid || `p_${Math.random().toString(36).substring(2, 9)}`;
            const slot = getNextAvailableSlot(room, data.requestedSlot);
            player = createDefaultPlayer(playerId, slot, data.name || `Player ${slot}`);
            room.players[playerId] = player;
          }

          clientConn = { ws, roomId, role: 'player', playerId };
          connections.set(ws, clientConn);

          ws.send(
            JSON.stringify({
              type: 'joined',
              playerId,
              slot: player.slot,
              role: 'player',
              roomState: room,
            })
          );

          // Immediately broadcast updated state to host and all controllers
          broadcastToRoom(roomId, {
            type: 'room_state',
            state: room,
          });
        }
      }

      if (!clientConn) return;
      const { roomId, playerId, role } = clientConn;
      const room = rooms.get(roomId);
      if (!room) return;

      if (data.type === 'input_change') {
        const player = room.players[playerId];
        if (!player) return;

        const button: BuzzerButton = data.button;
        const pressed: boolean = data.pressed;
        player.inputs[button] = pressed;

        // Big Red Buzzer Logic
        if (button === 'red' && pressed) {
          if (!player.lockedOut && player.buzzRank === null) {
            const now = Date.now();
            player.lastBuzzedAt = now;
            const deltaMs = room.armedAt ? Math.max(0, now - room.armedAt) : 0;
            const rank = room.buzzerOrder.length + 1;
            player.buzzRank = rank;

            room.buzzerOrder.push({
              playerId,
              slot: player.slot,
              name: player.name,
              timestamp: now,
              deltaMs,
            });

            if (room.status === 'armed' && rank === 1) {
              room.status = 'buzzed';
            }

            // Haptic feedback to the buzzer winner
            ws.send(
              JSON.stringify({
                type: 'haptic_signal',
                pattern: rank === 1 ? 'buzz' : 'short',
              })
            );
          }
        }

        // Fast broadcast input sync to host & PCSX2 python bridge
        broadcastToRoom(roomId, {
          type: 'player_input_sync',
          playerId,
          slot: player.slot,
          inputs: player.inputs,
          timestamp: Date.now(),
        });

        broadcastToRoom(roomId, {
          type: 'room_state',
          state: room,
        });
      }

      if (data.type === 'change_name') {
        const p = room.players[playerId];
        if (p && data.name) {
          p.name = data.name.trim().substring(0, 20);
          broadcastToRoom(roomId, {
            type: 'room_state',
            state: room,
          });
        }
      }

      if (data.type === 'change_slot') {
        const p = room.players[playerId];
        if (p && data.slot >= 1 && data.slot <= 8) {
          const isTaken = Object.values(room.players).some(
            (other) => other.id !== playerId && other.slot === data.slot && other.connected
          );
          if (!isTaken) {
            p.slot = data.slot;
            p.color = DEFAULT_PLAYER_COLORS[(data.slot - 1) % DEFAULT_PLAYER_COLORS.length];
            broadcastToRoom(roomId, {
              type: 'room_state',
              state: room,
            });
          }
        }
      }

      if (data.type === 'kick_player') {
        if (role === 'host' && data.playerId) {
          if (playerDisconnectTimers.has(data.playerId)) {
            clearTimeout(playerDisconnectTimers.get(data.playerId)!);
            playerDisconnectTimers.delete(data.playerId);
          }
          delete room.players[data.playerId];
          broadcastToRoom(roomId, {
            type: 'room_state',
            state: room,
          });
        }
      }

      if (data.type === 'haptic_signal') {
        // Forward haptic
        connections.forEach((conn) => {
          if (conn.roomId === roomId && conn.role === 'player') {
            if (!data.targetPlayerId || conn.playerId === data.targetPlayerId) {
              conn.ws.send(JSON.stringify(data));
            }
          }
        });
      }

      if (data.type === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
            timestamp: data.timestamp,
            serverTime: Date.now(),
          })
        );
      }

      if (data.type === 'pong') {
        const player = room.players[playerId];
        if (player) {
          player.ping = Math.max(1, Math.round((Date.now() - data.timestamp) / 2));
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (clientConn) {
      const { roomId, playerId, role } = clientConn;
      connections.delete(ws);
      const room = rooms.get(roomId);
      if (room && role === 'player' && room.players[playerId]) {
        // Mark as disconnected but retain slot reservation for 25 seconds in case of minor network blips
        room.players[playerId].connected = false;
        broadcastToRoom(roomId, {
          type: 'room_state',
          state: room,
        });

        // Set a grace timer to clean up slot if phone doesn't reconnect
        if (playerDisconnectTimers.has(playerId)) {
          clearTimeout(playerDisconnectTimers.get(playerId)!);
        }
        const timer = setTimeout(() => {
          playerDisconnectTimers.delete(playerId);
          const currentRoom = rooms.get(roomId);
          if (currentRoom && currentRoom.players[playerId] && !currentRoom.players[playerId].connected) {
            delete currentRoom.players[playerId];
            broadcastToRoom(roomId, {
              type: 'room_state',
              state: currentRoom,
            });
          }
        }, 25000);
        playerDisconnectTimers.set(playerId, timer);
      }
    }
  });
});

// Periodic ping to keep connections alive and calculate real-time phone latency
setInterval(() => {
  const now = Date.now();
  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.ping();
        conn.ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
      } catch (e) {
        // ignore
      }
    }
  });
}, 5000);

// API Endpoints
function getHostNetworkInterfaces(): NetworkInfoResponse {
  const nets = os.networkInterfaces();
  const results: HostNetworkInterface[] = [];

  for (const [name, netInterface] of Object.entries(nets)) {
    if (!netInterface) continue;
    for (const net of netInterface) {
      const isIPv4 = net.family === 'IPv4' || (net.family as unknown) === 4;
      if (isIPv4 && !net.internal && net.address && net.address !== '127.0.0.1' && net.address !== '0.0.0.0') {
        const lowerName = name.toLowerCase();
        let type: HostNetworkInterface['type'] = 'other';
        if (
          lowerName.includes('wi-fi') ||
          lowerName.includes('wifi') ||
          lowerName.includes('wlan') ||
          lowerName.includes('wireless')
        ) {
          type = 'wifi';
        } else if (lowerName.includes('hotspot') || lowerName.includes('ap')) {
          type = 'hotspot';
        } else if (
          lowerName.includes('eth') ||
          lowerName.includes('ethernet') ||
          lowerName.includes('lan') ||
          lowerName.includes('enp') ||
          lowerName.includes('eno') ||
          lowerName.includes('local area')
        ) {
          type = 'ethernet';
        } else if (
          lowerName.includes('vethernet') ||
          lowerName.includes('wsl') ||
          lowerName.includes('docker') ||
          lowerName.includes('virbr') ||
          lowerName.includes('vmnet') ||
          lowerName.includes('vbox') ||
          lowerName.includes('tailscale') ||
          lowerName.includes('hamachi') ||
          lowerName.includes('vpn')
        ) {
          type = 'virtual';
        }

        results.push({
          name,
          address: net.address,
          family: 'IPv4',
          isPrimary: false,
          type,
        });
      }
    }
  }

  // Sort candidates so that real Wi-Fi / Hotspot / Ethernet interfaces come first,
  // followed by common private subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x),
  // and deprioritizing link-local 169.254.x.x and virtual adapters.
  results.sort((a, b) => {
    const score = (item: HostNetworkInterface) => {
      let s = 0;
      if (item.type === 'wifi' || item.type === 'hotspot') s += 100;
      else if (item.type === 'ethernet') s += 80;
      else if (item.type === 'other') s += 50;
      else if (item.type === 'virtual') s -= 80;

      if (item.address.startsWith('192.168.')) s += 40;
      else if (item.address.startsWith('10.')) s += 30;
      else if (item.address.startsWith('172.')) {
        const secondOctet = parseInt(item.address.split('.')[1] || '0', 10);
        if (secondOctet >= 16 && secondOctet <= 31) s += 25;
      }

      if (item.address.startsWith('169.254.')) s -= 120;
      return s;
    };
    return score(b) - score(a);
  });

  let primaryIp: string | null = null;
  if (results.length > 0) {
    results[0].isPrimary = true;
    primaryIp = results[0].address;
  }

  return {
    primaryIp,
    interfaces: results,
    port: PORT,
    serverTime: Date.now(),
  };
}

app.get('/api/network-info', (req, res) => {
  const info = getHostNetworkInterfaces();
  res.json(info);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    connectedSockets: connections.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// PCSX2 Virtual Gamepad & USB HID Bridge Python Script Generator
app.get('/api/bridge/python', (req, res) => {
  const hostUrl = req.query.host || req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
  const roomId = (req.query.room as string) || 'BUZZ1';

  const pythonScript = `# ==============================================================================
# BUZZ! 8-Player Virtual USB Gamepad & HID Controller Bridge for PCSX2
# ==============================================================================
# This Python bridge connects directly to the BUZZ! Web Hub and creates 8 real
# Virtual Gamepads / DirectInput / Keyboard HID devices for PCSX2!
#
# Tested & Compatible with:
#   - PCSX2 (Buzz! The Mega Quiz, Buzz! The Hollywood Quiz, Buzz! Junior, etc.)
#   - RPCS3, MAME, DuckStation, Steam, & custom trivia engines
#
# Requirements (Install via terminal/cmd):
#   pip install websocket-client vgamepad keyboard
#
# Usage:
#   python buzz_pcsx2_bridge.py
# ==============================================================================

import json
import time
import sys
import threading

try:
    import websocket
except ImportError:
    print("[ERROR] Please install websocket-client: pip install websocket-client")
    sys.exit(1)

HAS_VGAMEPAD = False
try:
    import vgamepad as vg
    HAS_VGAMEPAD = True
    print("[SUCCESS] 'vgamepad' loaded! Emulating 8 native Virtual Xbox 360 / DualShock gamepads for PCSX2.")
except ImportError:
    print("[INFO] 'vgamepad' not found. Falling back to Keyboard / DirectInput HID emulation.")
    print("       To enable true Virtual Gamepads in PCSX2, run: pip install vgamepad")

HAS_KEYBOARD = False
try:
    import keyboard
    HAS_KEYBOARD = True
    print("[SUCCESS] 'keyboard' module loaded for direct PCSX2 key simulation.")
except ImportError:
    print("[INFO] 'keyboard' not found. Run 'pip install keyboard' if using keyboard input.")

HUB_WS_URL = "${protocol}://${hostUrl}"
ROOM_ID = "${roomId}"

# Initialize virtual gamepads for up to 8 players (if vgamepad available)
gamepads = []
if HAS_VGAMEPAD:
    for i in range(8):
        try:
            gamepads.append(vg.VX360Gamepad())
        except Exception as e:
            print(f"[!] Could not initialize Gamepad {i+1}: {e}")
            break
    print(f"[OK] Initialized {len(gamepads)} Virtual Controllers for PCSX2!")

# Default PCSX2 Buzz! Keyboard Key Mappings (Slots 1 to 8)
KEY_MAPPINGS = {
    1: {'red': 'space', 'blue': '1', 'orange': '2', 'green': '3', 'yellow': '4'},
    2: {'red': 'enter', 'blue': '5', 'orange': '6', 'green': '7', 'yellow': '8'},
    3: {'red': 'q', 'blue': 'w', 'orange': 'e', 'green': 'r', 'yellow': 't'},
    4: {'red': 'a', 'blue': 's', 'orange': 'd', 'green': 'f', 'yellow': 'g'},
    5: {'red': 'z', 'blue': 'x', 'orange': 'c', 'green': 'v', 'yellow': 'b'},
    6: {'red': 'u', 'blue': 'i', 'orange': 'o', 'green': 'p', 'yellow': '['},
    7: {'red': 'j', 'blue': 'k', 'orange': 'l', 'green': ';', 'yellow': "'"},
    8: {'red': 'n', 'blue': 'm', 'orange': ',', 'green': '.', 'yellow': '/'},
}

def handle_input_event(slot, inputs):
    slot_idx = slot - 1
    
    # 1. Virtual Gamepad Output for PCSX2 (Xbox 360 / DualShock)
    # Mapping for Buzz Buzzers in PCSX2:
    # Red Dome  -> Button A (or Trigger)
    # Blue Bar   -> Button X
    # Orange Bar -> Button B
    # Green Bar  -> Button Y
    # Yellow Bar -> Right Shoulder (RB)
    if HAS_VGAMEPAD and slot_idx < len(gamepads):
        gp = gamepads[slot_idx]
        
        # Red Buzzer -> A Button
        if inputs.get('red'):
            gp.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_A)
        else:
            gp.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_A)
            
        # Blue -> X Button
        if inputs.get('blue'):
            gp.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X)
        else:
            gp.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_X)
            
        # Orange -> B Button
        if inputs.get('orange'):
            gp.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)
        else:
            gp.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_B)
            
        # Green -> Y Button
        if inputs.get('green'):
            gp.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_Y)
        else:
            gp.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_Y)
            
        # Yellow -> Right Shoulder (RB)
        if inputs.get('yellow'):
            gp.press_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER)
        else:
            gp.release_button(button=vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER)
            
        gp.update()
        
    # 2. Keyboard HID Emulation for PCSX2
    if HAS_KEYBOARD and slot in KEY_MAPPINGS:
        mapping = KEY_MAPPINGS[slot]
        for btn in ['red', 'blue', 'orange', 'green', 'yellow']:
            key = mapping.get(btn)
            if key:
                if inputs.get(btn):
                    keyboard.press(key)
                else:
                    keyboard.release(key)

def on_message(ws, message):
    try:
        data = json.loads(message)
        msg_type = data.get('type')
        
        if msg_type == 'player_input_sync':
            slot = data.get('slot', 1)
            inputs = data.get('inputs', {})
            active_keys = [k.upper() for k, v in inputs.items() if v]
            if active_keys:
                print(f"[PCSX2 INPUT] Slot {slot}: {', '.join(active_keys)}")
            handle_input_event(slot, inputs)
            
        elif msg_type == 'room_state':
            players = data.get('state', {}).get('players', {})
            for pid, player in players.items():
                slot = player.get('slot', 1)
                inputs = player.get('inputs', {})
                handle_input_event(slot, inputs)
    except Exception as e:
        print(f"[!] Error handling message: {e}")

def on_open(ws):
    print(f"[+] Connected to BUZZ! Hub ({HUB_WS_URL})! Room: {ROOM_ID}")
    print("[*] Streaming phone buzzer presses directly into PCSX2 Virtual Gamepads...")
    join_msg = {
        "type": "join",
        "roomId": ROOM_ID,
        "role": "host"
    }
    ws.send(json.dumps(join_msg))

def on_close(ws, close_status_code, close_msg):
    print("[!] WebSocket disconnected. Reconnecting in 2 seconds...")
    time.sleep(2)
    start_bridge()

def start_bridge():
    ws = websocket.WebSocketApp(
        HUB_WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_close=on_close
    )
    ws.run_forever()

if __name__ == "__main__":
    print("================================================================")
    print("🎮 BUZZ! Multi-Phone Virtual Gamepad Bridge for PCSX2")
    print(f"🔗 Target Hub: {HUB_WS_URL} (Room: {ROOM_ID})")
    print("🕹️ Status: Emulating 8 PS2/Xbox Buzzer Controllers")
    print("================================================================")
    start_bridge()
`;

  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="buzz_pcsx2_bridge.py"');
  res.send(pythonScript);
});

// Windows 1-Click Launch Batch File Download
app.get('/api/download/start-bat', (req, res) => {
  const batFilePath = path.join(process.cwd(), 'Start_Buzz.bat');
  res.setHeader('Content-Type', 'application/x-bat');
  res.setHeader('Content-Disposition', 'attachment; filename="Start_Buzz.bat"');
  res.sendFile(batFilePath);
});

async function startServer() {
  // Vite dev integration vs compiled dist static serving
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && (__filename.endsWith('.cjs') || __filename.includes('dist')));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const netInfo = getHostNetworkInterfaces();
    console.log(`\n============================================================`);
    console.log(`🎮 BUZZ! Virtual Controller Hub is Online!`);
    console.log(`   💻 PC Localhost:  http://localhost:${PORT}`);
    if (netInfo.primaryIp) {
      console.log(`   📱 Phone Join IP: http://${netInfo.primaryIp}:${PORT}`);
      console.log(`   📶 Connect phones to same Wi-Fi / Hotspot & scan QR code`);
      if (netInfo.interfaces.length > 1) {
        console.log(`   🌐 All Detected Network Adapters:`);
        netInfo.interfaces.forEach((iface) => {
          console.log(`      • ${iface.name} [${iface.type}]: http://${iface.address}:${PORT}${iface.isPrimary ? ' (Primary)' : ''}`);
        });
      }
    } else {
      console.log(`   ℹ️ No LAN IPv4 detected yet. Phones require Wi-Fi or hotspot.`);
    }
    console.log(`============================================================\n`);
  });
}

startServer();
