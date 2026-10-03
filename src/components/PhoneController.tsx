import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Settings,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { BuzzerButton, Player, PlayerInputState, RoomState, WSMessage, PLAYER_COLORS } from '../types';
import { wsClient } from '../services/websocket';
import { sound } from '../audio';

interface PhoneControllerProps {
  initialRoomId: string;
  initialSlot?: number;
}

export const PhoneController: React.FC<PhoneControllerProps> = ({
  initialRoomId,
  initialSlot = 1,
}) => {
  const [roomId] = useState<string>(initialRoomId);
  const [connected, setConnected] = useState<boolean>(false);
  const [playerSlot, setPlayerSlot] = useState<number>(initialSlot);
  const [playerName, setPlayerName] = useState<string>(`Player ${initialSlot}`);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [ping, setPing] = useState<number>(12);

  // Local active press states for instant 0ms visual feedback
  const [localInputs, setLocalInputs] = useState<PlayerInputState>({
    red: false,
    blue: false,
    orange: false,
    green: false,
    yellow: false,
  });

  const activePointers = useRef<Map<number, BuzzerButton>>(new Map());

  // Setup WebSocket connection
  useEffect(() => {
    wsClient.connect(roomId, 'player', playerName, playerSlot);

    const unsubscribe = wsClient.subscribe((msg: WSMessage) => {
      if (msg.type === 'joined') {
        setConnected(true);
        setPlayerSlot(msg.slot);
        setRoomState(msg.roomState);
      } else if (msg.type === 'room_state') {
        setRoomState(msg.state);
        // Synchronize slot and name if updated by server
        if (wsClient.playerId && msg.state.players[wsClient.playerId]) {
          const p = msg.state.players[wsClient.playerId];
          setPlayerSlot(p.slot);
          setPlayerName(p.name);
          setConnected(true);
        }
      } else if (msg.type === 'haptic_signal') {
        triggerHaptic(msg.pattern);
        if (msg.pattern === 'buzz' || msg.pattern === 'correct') {
          flashScreen(msg.pattern === 'buzz' ? 'bg-red-500/40' : 'bg-emerald-500/40');
        }
      }
    });

    const pingInterval = setInterval(() => {
      setConnected(wsClient.isConnected);
      if (wsClient.roomState && wsClient.playerId) {
        const myPlayer = wsClient.roomState.players[wsClient.playerId];
        if (myPlayer) {
          setPing(myPlayer.ping || 12);
        }
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(pingInterval);
    };
  }, [roomId]);

  const triggerHaptic = useCallback((pattern: 'buzz' | 'correct' | 'wrong' | 'short' = 'short') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (pattern === 'buzz') {
          navigator.vibrate([100, 50, 150]);
        } else if (pattern === 'correct') {
          navigator.vibrate([80, 40, 80]);
        } else if (pattern === 'wrong') {
          navigator.vibrate([200]);
        } else {
          navigator.vibrate(35);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const flashScreen = (colorClass: string) => {
    setScreenFlash(colorClass);
    setTimeout(() => {
      setScreenFlash(null);
    }, 300);
  };

  // Fast pointer press handlers
  const handleButtonPress = useCallback(
    (button: BuzzerButton, pointerId?: number) => {
      if (pointerId !== undefined) {
        activePointers.current.set(pointerId, button);
      }

      setLocalInputs((prev) => ({ ...prev, [button]: true }));
      triggerHaptic(button === 'red' ? 'buzz' : 'short');

      if (button === 'red') {
        sound.playBuzzer();
        flashScreen('bg-red-500/30');
      } else {
        const freqs: Record<BuzzerButton, number> = {
          red: 140,
          blue: 523,
          orange: 587,
          green: 659,
          yellow: 783,
        };
        sound.playButtonClick(freqs[button]);
      }

      wsClient.sendInput(button, true);
    },
    [triggerHaptic]
  );

  const handleButtonRelease = useCallback((button: BuzzerButton, pointerId?: number) => {
    if (pointerId !== undefined) {
      activePointers.current.delete(pointerId);
    }
    setLocalInputs((prev) => ({ ...prev, [button]: false }));
    wsClient.sendInput(button, false);
  }, []);

  // Pointer event listeners to prevent sticky presses when moving off button
  const createButtonListeners = (button: BuzzerButton) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleButtonPress(button, e.pointerId);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      handleButtonRelease(button, e.pointerId);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      handleButtonRelease(button, e.pointerId);
    },
    onTouchStart: (e: React.TouchEvent) => {
      e.stopPropagation();
    },
  });

  const myPlayer: Player | undefined =
    roomState && wsClient.playerId ? roomState.players[wsClient.playerId] : undefined;

  const colorTheme = PLAYER_COLORS[playerSlot] || PLAYER_COLORS[1];

  const handleNameSave = (newName: string) => {
    setPlayerName(newName);
    wsClient.send({ type: 'change_name', name: newName });
  };

  const handleSlotChange = (newSlot: number) => {
    setPlayerSlot(newSlot);
    wsClient.setSlot(newSlot);
  };

  return (
    <div
      id="phone-controller-container"
      className="relative flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-black text-slate-100 select-none overflow-hidden touch-none font-sans border-x border-slate-900 shadow-2xl"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Screen Flash Animation */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-none absolute inset-0 z-50 ${screenFlash}`}
          />
        )}
      </AnimatePresence>

      {/* Top Mobile App Bar */}
      <header
        id="controller-header"
        className="flex items-center justify-between px-4 py-2.5 bg-black border-b border-slate-800 z-20 shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-md border"
            style={{ backgroundColor: colorTheme.hex, borderColor: '#ffffff60' }}
          >
            {playerSlot < 10 ? `0${playerSlot}` : playerSlot}
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-sm text-white tracking-wide truncate max-w-[130px]">
                {myPlayer?.name || playerName}
              </span>
              <span
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded text-white font-bold"
                style={{ backgroundColor: colorTheme.hex }}
              >
                SLOT {playerSlot}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                {connected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                    <span className="text-emerald-400 font-mono">{ping}ms</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-rose-400">CONNECTING...</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-400 uppercase">ROOM_{roomId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-sound-toggle"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              sound.setMuted(next);
            }}
            aria-label="Toggle Sound"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-600" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>
          <button
            id="btn-settings-toggle"
            onClick={() => setShowSettings(true)}
            aria-label="Controller Settings"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main BUZZ! Controller Body */}
      <main
        id="controller-surface"
        className="flex-1 flex flex-col justify-between p-3 sm:p-4 gap-2.5 sm:gap-3 overflow-hidden bg-black min-h-0"
      >
        {/* BIG RED BUZZER (Classic Top Dome - Icon Only) */}
        <section
          id="buzzer-dome-section"
          className="shrink-0 flex items-center justify-center py-1 sm:py-2 relative"
        >
          {/* Glow Aura */}
          {localInputs.red && (
            <div className="absolute w-56 h-56 rounded-full bg-red-600/30 blur-3xl animate-pulse pointer-events-none" />
          )}

          {/* 3D Buzzer Enclosure Ring */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-gradient-to-b from-slate-800 to-black shadow-2xl border border-slate-800 flex items-center justify-center">
            <div className="absolute inset-1 rounded-full border border-slate-800/80 bg-slate-950" />

            {/* Pressable Dome Button */}
            <motion.button
              id="btn-buzz-dome"
              {...createButtonListeners('red')}
              animate={{
                scale: localInputs.red ? 0.93 : 1,
                y: localInputs.red ? 5 : 0,
              }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-white cursor-pointer select-none transition-shadow ${
                localInputs.red
                  ? 'bg-gradient-to-b from-red-600 to-red-800 shadow-[inset_0_8px_16px_rgba(0,0,0,0.6),0_0_35px_rgba(239,68,68,0.9)] ring-4 ring-red-400'
                  : 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 shadow-[0_10px_20px_rgba(220,38,38,0.5),inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_0_#7f1d1d]'
              }`}
            >
              {/* Radial Highlight Glass Reflection */}
              <div className="absolute top-2 w-20 sm:w-26 h-8 sm:h-10 rounded-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

              {/* Just the Symbol / Icon - No Text */}
              <div className="relative z-10 flex items-center justify-center pointer-events-none">
                <Zap
                  className={`w-14 h-14 sm:w-18 sm:h-18 drop-shadow-[0_3px_6px_rgba(0,0,0,0.8)] fill-current transition-transform ${
                    localInputs.red ? 'text-amber-200 scale-110' : 'text-white'
                  }`}
                />
              </div>
            </motion.button>
          </div>
        </section>

        {/* 4 COLORED BUTTON BARS IN A SINGLE COLUMN UNDERNEATH - TALL & SPACE-OPTIMIZED */}
        <section
          id="choice-buttons-column"
          aria-label="Colored Input Bars"
          className="flex-1 flex flex-col gap-2 sm:gap-2.5 min-h-0 pb-1"
        >
          {/* 1. BLUE BAR */}
          <motion.button
            id="btn-choice-blue"
            {...createButtonListeners('blue')}
            animate={{
              scale: localInputs.blue ? 0.97 : 1,
              y: localInputs.blue ? 3 : 0,
            }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`relative flex-1 min-h-[58px] sm:min-h-[66px] w-full rounded-2xl flex items-center justify-between px-5 sm:px-6 text-white cursor-pointer select-none transition-shadow border border-blue-400/40 ${
              localInputs.blue
                ? 'bg-blue-600 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.8)] ring-2 ring-blue-300'
                : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 shadow-[0_5px_0_#1e3a8a,0_6px_12px_rgba(37,99,235,0.35)] active:shadow-none'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-900/70 border border-white/30 flex items-center justify-center font-black text-sm shadow-inner font-mono">
                1
              </div>
              <div className="text-left font-black text-lg sm:text-xl tracking-wider">
                BLUE
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono tracking-widest text-blue-200/80 hidden sm:inline font-bold">Top</span>
              <div className="w-5 h-5 rounded-full border-2 border-white/90 shadow-sm" />
            </div>
          </motion.button>

          {/* 2. ORANGE BAR */}
          <motion.button
            id="btn-choice-orange"
            {...createButtonListeners('orange')}
            animate={{
              scale: localInputs.orange ? 0.97 : 1,
              y: localInputs.orange ? 3 : 0,
            }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`relative flex-1 min-h-[58px] sm:min-h-[66px] w-full rounded-2xl flex items-center justify-between px-5 sm:px-6 text-white cursor-pointer select-none transition-shadow border border-orange-400/40 ${
              localInputs.orange
                ? 'bg-orange-600 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(249,115,22,0.8)] ring-2 ring-orange-300'
                : 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 shadow-[0_5px_0_#7c2d12,0_6px_12px_rgba(234,88,12,0.35)] active:shadow-none'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-orange-900/70 border border-white/30 flex items-center justify-center font-black text-sm shadow-inner font-mono">
                2
              </div>
              <div className="text-left font-black text-lg sm:text-xl tracking-wider">
                ORANGE
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono tracking-widest text-orange-200/80 hidden sm:inline font-bold">2nd</span>
              <div className="w-4.5 h-4.5 border-2 border-white/90 shadow-sm" />
            </div>
          </motion.button>

          {/* 3. GREEN BAR */}
          <motion.button
            id="btn-choice-green"
            {...createButtonListeners('green')}
            animate={{
              scale: localInputs.green ? 0.97 : 1,
              y: localInputs.green ? 3 : 0,
            }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`relative flex-1 min-h-[58px] sm:min-h-[66px] w-full rounded-2xl flex items-center justify-between px-5 sm:px-6 text-white cursor-pointer select-none transition-shadow border border-emerald-400/40 ${
              localInputs.green
                ? 'bg-emerald-600 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.8)] ring-2 ring-emerald-300'
                : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 shadow-[0_5px_0_#064e3b,0_6px_12px_rgba(22,163,74,0.35)] active:shadow-none'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/70 border border-white/30 flex items-center justify-center font-black text-sm shadow-inner font-mono">
                3
              </div>
              <div className="text-left font-black text-lg sm:text-xl tracking-wider">
                GREEN
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono tracking-widest text-emerald-200/80 hidden sm:inline font-bold">3rd</span>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-white/95" />
            </div>
          </motion.button>

          {/* 4. YELLOW BAR */}
          <motion.button
            id="btn-choice-yellow"
            {...createButtonListeners('yellow')}
            animate={{
              scale: localInputs.yellow ? 0.97 : 1,
              y: localInputs.yellow ? 3 : 0,
            }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className={`relative flex-1 min-h-[58px] sm:min-h-[66px] w-full rounded-2xl flex items-center justify-between px-5 sm:px-6 text-slate-950 cursor-pointer select-none transition-shadow border border-amber-300/50 ${
              localInputs.yellow
                ? 'bg-amber-400 shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_0_20px_rgba(234,179,8,0.8)] ring-2 ring-amber-200'
                : 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 shadow-[0_5px_0_#78350f,0_6px_12px_rgba(202,138,4,0.35)] active:shadow-none'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-black/20 flex items-center justify-center font-black text-sm shadow-inner font-mono text-slate-950">
                4
              </div>
              <div className="text-left font-black text-lg sm:text-xl tracking-wider">
                YELLOW
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono tracking-widest opacity-80 hidden sm:inline font-bold">Bottom</span>
              <div className="font-mono font-black text-xl leading-none">✕</div>
            </div>
          </motion.button>
        </section>
      </main>

      {/* Footer Navigation */}
      <footer className="px-4 py-2.5 bg-black border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>PCSX2_CONTROLLER_NODE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 uppercase text-[11px]">SLOT {playerSlot} ACTIVE</span>
        </div>
      </footer>

      {/* Settings Modal Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-base text-white">Controller Slot Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-sm">
                {/* Name Edit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Player Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={18}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter player name"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                    />
                    <button
                      onClick={() => handleNameSave(playerName)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white active:scale-95 transition"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Player Slot Picker (1-8) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Select Controller Slot (1 to 8)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
                      const isCurrent = playerSlot === s;
                      const col = PLAYER_COLORS[s];
                      return (
                        <button
                          key={s}
                          onClick={() => handleSlotChange(s)}
                          className={`py-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition ${
                            isCurrent
                              ? 'border-white bg-slate-800 text-white shadow-lg ring-2 ring-white/50'
                              : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span className="text-xs font-mono">Slot {s}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vibration & Sound Test */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-mono">Test Haptics & Sound:</span>
                  <button
                    onClick={() => {
                      triggerHaptic('buzz');
                      sound.playBuzzer();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white active:scale-95 font-mono"
                  >
                    Test Buzzer
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-center transition"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
