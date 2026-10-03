export type BuzzerButton = 'red' | 'blue' | 'orange' | 'green' | 'yellow';

export interface PlayerInputState {
  red: boolean;     // Big Red Buzzer
  blue: boolean;    // Choice 1 / Blue
  orange: boolean;  // Choice 2 / Orange
  green: boolean;   // Choice 3 / Green
  yellow: boolean;  // Choice 4 / Yellow
}

export interface Player {
  id: string;             // Socket / client unique ID
  slot: number;           // 1 to 8
  name: string;
  color: string;          // Hex color or predefined color
  isHost?: boolean;
  connected: boolean;
  ping: number;           // ms round trip
  inputs: PlayerInputState;
  score: number;
  lastBuzzedAt: number | null; // Timestamp in ms
  buzzRank: number | null;     // 1st, 2nd, etc. in current round
  lockedOut: boolean;
  selectedChoice?: BuzzerButton | null;
}

export type GameStateStatus = 'idle' | 'armed' | 'buzzed' | 'locked' | 'review';

export interface RoomState {
  roomId: string;
  status: GameStateStatus;
  armedAt: number | null;
  buzzerOrder: { playerId: string; slot: number; name: string; timestamp: number; deltaMs: number }[];
  players: Record<string, Player>;
  currentQuestion?: {
    text: string;
    choices: {
      blue: string;
      orange: string;
      green: string;
      yellow: string;
    };
    correctChoice?: BuzzerButton;
    revealed?: boolean;
  };
}

export type WSMessage =
  | { type: 'join'; roomId: string; role: 'host' | 'player'; name?: string; requestedSlot?: number; existingPlayerId?: string }
  | { type: 'joined'; playerId: string; slot: number; role: 'host' | 'player'; roomState: RoomState }
  | { type: 'room_state'; state: RoomState }
  | { type: 'input_change'; button: BuzzerButton; pressed: boolean; clientTimestamp: number }
  | { type: 'player_input_sync'; playerId: string; slot: number; inputs: PlayerInputState; timestamp: number }
  | { type: 'arm_buzzers' }
  | { type: 'reset_buzzers' }
  | { type: 'lock_buzzers' }
  | { type: 'set_score'; playerId: string; score: number }
  | { type: 'haptic_signal'; targetPlayerId?: string; targetSlot?: number; pattern: 'buzz' | 'correct' | 'wrong' | 'short' }
  | { type: 'set_question'; question: RoomState['currentQuestion'] }
  | { type: 'reveal_answer' }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number; serverTime: number }
  | { type: 'change_name'; name: string }
  | { type: 'change_slot'; slot: number }
  | { type: 'kick_player'; playerId: string };

export const PLAYER_COLORS: { [key: number]: { bg: string; border: string; text: string; hex: string; name: string } } = {
  1: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500', hex: '#ef4444', name: 'Crimson' },
  2: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', hex: '#3b82f6', name: 'Cobalt' },
  3: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500', hex: '#10b981', name: 'Emerald' },
  4: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500', hex: '#f59e0b', name: 'Amber' },
  5: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500', hex: '#a855f7', name: 'Purple' },
  6: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-500', hex: '#06b6d4', name: 'Cyan' },
  7: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899', name: 'Magenta' },
  8: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316', name: 'Orange' },
};

export const BUZZ_BUTTON_CONFIG: Record<BuzzerButton, { name: string; color: string; hoverColor: string; key: string; label: string; icon: string }> = {
  red: { name: 'Buzz Dome', color: '#dc2626', hoverColor: '#ef4444', key: 'Space', label: 'BUZZ', icon: '🔴' },
  blue: { name: 'Blue', color: '#2563eb', hoverColor: '#3b82f6', key: '1', label: 'BLUE', icon: '🔵' },
  orange: { name: 'Orange', color: '#ea580c', hoverColor: '#f97316', key: '2', label: 'ORANGE', icon: '🟠' },
  green: { name: 'Green', color: '#16a34a', hoverColor: '#22c55e', key: '3', label: 'GREEN', icon: '🟢' },
  yellow: { name: 'Yellow', color: '#ca8a04', hoverColor: '#eab308', label: 'YELLOW', key: '4', icon: '🟡' },
};

export interface HostNetworkInterface {
  name: string;
  address: string;
  family: string;
  isPrimary: boolean;
  type: 'wifi' | 'ethernet' | 'hotspot' | 'virtual' | 'other';
}

export interface NetworkInfoResponse {
  primaryIp: string | null;
  interfaces: HostNetworkInterface[];
  port: number;
  serverTime?: number;
}
