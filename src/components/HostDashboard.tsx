import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2,
  QrCode,
  Volume2,
  VolumeX,
  Smartphone,
  Vibrate,
  UserX,
  Zap,
  Activity,
  ExternalLink,
  PlusCircle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { RoomState, Player, PLAYER_COLORS, WSMessage, BuzzerButton } from '../types';
import { wsClient } from '../services/websocket';
import { sound } from '../audio';
import { USBBridgeModal } from './USBBridgeModal';
import { QRCodeModal } from './QRCodeModal';
import { useNetworkInfo } from '../services/networkInfo';

interface HostDashboardProps {
  roomId: string;
  onSwitchToController?: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({ roomId, onSwitchToController }) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showBridgeModal, setShowBridgeModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [activeSlotTesting, setActiveSlotTesting] = useState<number | null>(null);

  const { getEffectiveHost } = useNetworkInfo();
  const effectiveHost = getEffectiveHost();

  // Poll room state & connect via WebSocket
  useEffect(() => {
    // Initial fetch to guarantee state is synced immediately
    fetch(`/api/room/${roomId}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setRoomState(data);
      })
      .catch(() => {});

    wsClient.connect(roomId, 'host');

    const unsubscribe = wsClient.subscribe((msg: WSMessage) => {
      if (msg.type === 'joined' || msg.type === 'room_state') {
        const state = msg.type === 'joined' ? msg.roomState : msg.state;
        setRoomState(state);
      } else if (msg.type === 'player_input_sync') {
        // Update local room state player inputs
        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedPlayers = { ...prev.players };
          const p = (Object.values(updatedPlayers) as Player[]).find((pl) => pl.slot === msg.slot);
          if (p) {
            p.inputs = msg.inputs;
          }
          return { ...prev, players: updatedPlayers };
        });

        // Audio feedback on host
        if (msg.inputs.red) {
          sound.playBuzzer();
        }
      }
    });

    // Periodic sync fallback
    const interval = setInterval(() => {
      fetch(`/api/room/${roomId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setRoomState(data);
        })
        .catch(() => {});
    }, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [roomId]);

  const handleVibratePlayer = (playerId: string) => {
    wsClient.send({
      type: 'haptic_signal',
      targetPlayerId: playerId,
      pattern: 'buzz',
    });
  };

  const handleKickPlayer = (playerId: string) => {
    wsClient.send({
      type: 'kick_player',
      playerId,
    });
  };

  // Test slot input simulation (for testing PCSX2 mapping directly from host)
  const handleSimulateButton = (slot: number, button: BuzzerButton, pressed: boolean) => {
    wsClient.send({
      type: 'player_input_sync',
      playerId: `sim_${slot}`,
      slot,
      inputs: {
        red: button === 'red' ? pressed : false,
        blue: button === 'blue' ? pressed : false,
        orange: button === 'orange' ? pressed : false,
        green: button === 'green' ? pressed : false,
        yellow: button === 'yellow' ? pressed : false,
      },
      timestamp: Date.now(),
    });

    if (pressed) {
      if (button === 'red') sound.playBuzzer();
      else sound.playButtonClick(500);
    }
  };

  const allPlayers: Player[] = roomState ? (Object.values(roomState.players) as Player[]) : [];
  const connectedPlayersCount = allPlayers.filter((p) => p.connected).length;

  return (
    <div
      id="host-dashboard-container"
      className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Top Main Navigation Header */}
      <header
        id="host-header"
        className="px-4 sm:px-8 py-4 bg-black border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
              Buzz <span className="text-blue-500 underline decoration-2 underline-offset-4">PCSX2 Controller Hub</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest">
              8-Slot Virtual Gamepad & USB HID Matrix
            </p>
          </div>
        </div>

        {/* Global Telemetry & Actions */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Emulation Target</span>
              <span className="text-emerald-400 font-mono text-xs flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                PCSX2 VIRTUAL GAMEPAD (8 SLOTS)
              </span>
            </div>
            <div className="flex flex-col items-end border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Phone Join IP</span>
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="text-emerald-400 hover:text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition group"
                title="Click to view QR code & network details"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform"></span>
                <span>{effectiveHost}</span>
              </button>
            </div>
            <div className="flex flex-col items-end border-l border-slate-800 pl-4">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Room Code</span>
              <span className="text-blue-400 font-mono text-xs font-bold">{roomId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Open Controller Link */}
            <a
              href="/?mode=controller"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Open Controller in New Tab</span>
              <span className="sm:hidden">Test Phone</span>
            </a>

            {/* QR Code Phone Join Button */}
            <button
              id="btn-show-qr"
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold text-xs active:scale-95 transition shadow-[0_0_15px_rgba(37,99,235,0.15)]"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Connect Phones</span>
            </button>

            {/* PCSX2 Virtual Gamepad Bridge Button */}
            <button
              id="btn-show-usb-bridge"
              onClick={() => setShowBridgeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 border border-blue-400 text-white font-bold text-xs active:scale-95 transition shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>PCSX2 Bridge Setup</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              id="btn-host-sound"
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                sound.setMuted(next);
              }}
              aria-label="Toggle Host Sound"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-600" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* TOP STATUS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* PCSX2 Virtual Gamepad Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>PCSX2 VIRTUAL GAMEPAD</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  8-Player Virtual Gamepad Output
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowBridgeModal(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono uppercase tracking-wider underline font-bold"
            >
              Instructions
            </button>
          </div>

          {/* Connected Phones Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                  <span>PHONE SLOTS</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">
                    {effectiveHost}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  <span className="text-emerald-400 font-bold">{connectedPlayersCount}</span> of 8 Slots Occupied
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowQRModal(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono uppercase tracking-wider underline font-bold"
            >
              Join QR
            </button>
          </div>

          {/* Polling & Latency Telemetry */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase font-mono">
                  LATENCY & POLL RATE
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  1000Hz Fast Event Stream
                </div>
              </div>
            </div>
            <span className="font-mono text-emerald-400 text-xs font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              0.8ms Avg
            </span>
          </div>
        </div>

        {/* 8-CONTROLLER MATRIX WITH INPUTS UNDER EACH SLOT */}
        <section aria-label="8-Player Controller Station">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-black tracking-tight text-white uppercase font-mono">
                8-Controller Buzz! Slot Matrix
              </h2>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Live button states streamed into PCSX2
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
              const player = allPlayers.find((p) => p.slot === slot && p.connected);
              const isConnected = !!player;
              const inputs = player?.inputs || {
                red: false,
                blue: false,
                orange: false,
                green: false,
                yellow: false,
              };
              const slotFormatted = slot < 10 ? `0${slot}` : `${slot}`;
              const pingDisplay = player?.ping || 12;
              const themeColor = PLAYER_COLORS[slot] || PLAYER_COLORS[1];

              return (
                <div
                  key={slot}
                  id={`player-card-slot-${slot}`}
                  className={`relative rounded-xl p-3.5 flex flex-col justify-between transition-all duration-150 border ${
                    isConnected
                      ? inputs.red
                        ? 'bg-slate-900 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] ring-1 ring-red-500'
                        : 'bg-slate-900/80 border-slate-700 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white font-mono shadow-sm"
                        style={{ backgroundColor: themeColor.hex }}
                      >
                        {slotFormatted}
                      </span>
                      <div className="text-left">
                        <h3 className="font-bold text-xs text-white truncate max-w-[110px]">
                          {isConnected && player ? player.name : `Slot ${slot}`}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isConnected ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{pingDisplay}ms</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500 uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          EMPTY
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CONTROLLER INPUTS DISPLAY UNDER THIS SLOT */}
                  <div className="py-2.5 space-y-2">
                    {/* Big Red Dome Buzzer Input */}
                    <div
                      className={`relative w-full py-2 px-3 rounded-lg flex items-center justify-between border transition-all duration-100 ${
                        inputs.red
                          ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] scale-[1.02]'
                          : 'bg-red-950/20 border-red-900/40 text-red-300/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            inputs.red
                              ? 'bg-white text-red-600 border-white animate-pulse'
                              : 'bg-red-900/40 text-red-400 border-red-700/60'
                          }`}
                        >
                          <Zap className="w-3 h-3 fill-current" />
                        </div>
                        <span className="font-black text-xs tracking-wider uppercase font-mono">
                          RED BUZZER
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          inputs.red
                            ? 'bg-black/40 text-white shadow'
                            : 'text-red-400/50'
                        }`}
                      >
                        {inputs.red ? 'PRESSED (1)' : '0'}
                      </span>
                    </div>

                    {/* 4 Colored Input Bars (Blue, Orange, Green, Yellow in column) */}
                    <div className="flex flex-col gap-1.5">
                      {/* 1. BLUE BAR */}
                      <div
                        className={`w-full py-1 px-2.5 rounded-md flex items-center justify-between border transition-all duration-100 ${
                          inputs.blue
                            ? 'bg-blue-600 border-blue-300 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)] scale-[1.02]'
                            : 'bg-blue-950/20 border-blue-900/30 text-blue-300/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded bg-blue-900/80 border border-blue-400/40 text-[9px] font-mono font-bold flex items-center justify-center text-white">
                            1
                          </span>
                          <span className="text-[11px] font-bold tracking-wide font-mono">
                            BLUE
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${inputs.blue ? 'text-white' : 'text-slate-500'}`}>
                          {inputs.blue ? 'ON' : '0'}
                        </span>
                      </div>

                      {/* 2. ORANGE BAR */}
                      <div
                        className={`w-full py-1 px-2.5 rounded-md flex items-center justify-between border transition-all duration-100 ${
                          inputs.orange
                            ? 'bg-orange-600 border-orange-300 text-white shadow-[0_0_12px_rgba(249,115,22,0.6)] scale-[1.02]'
                            : 'bg-orange-950/20 border-orange-900/30 text-orange-300/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded bg-orange-900/80 border border-orange-400/40 text-[9px] font-mono font-bold flex items-center justify-center text-white">
                            2
                          </span>
                          <span className="text-[11px] font-bold tracking-wide font-mono">
                            ORANGE
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${inputs.orange ? 'text-white' : 'text-slate-500'}`}>
                          {inputs.orange ? 'ON' : '0'}
                        </span>
                      </div>

                      {/* 3. GREEN BAR */}
                      <div
                        className={`w-full py-1 px-2.5 rounded-md flex items-center justify-between border transition-all duration-100 ${
                          inputs.green
                            ? 'bg-emerald-600 border-emerald-300 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)] scale-[1.02]'
                            : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-300/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded bg-emerald-900/80 border border-emerald-400/40 text-[9px] font-mono font-bold flex items-center justify-center text-white">
                            3
                          </span>
                          <span className="text-[11px] font-bold tracking-wide font-mono">
                            GREEN
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${inputs.green ? 'text-white' : 'text-slate-500'}`}>
                          {inputs.green ? 'ON' : '0'}
                        </span>
                      </div>

                      {/* 4. YELLOW BAR */}
                      <div
                        className={`w-full py-1 px-2.5 rounded-md flex items-center justify-between border transition-all duration-100 ${
                          inputs.yellow
                            ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-[0_0_12px_rgba(234,179,8,0.6)] scale-[1.02]'
                            : 'bg-amber-950/20 border-amber-900/30 text-amber-300/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded bg-amber-900/40 border border-amber-500/40 text-[9px] font-mono font-bold flex items-center justify-center text-amber-300">
                            4
                          </span>
                          <span className="text-[11px] font-bold tracking-wide font-mono">
                            YELLOW
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${inputs.yellow ? 'text-slate-950' : 'text-slate-500'}`}>
                          {inputs.yellow ? 'ON' : '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slot Controls (Test Buttons, Vibrate, Kick) */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {isConnected && player ? (
                      <>
                        <button
                          onClick={() => handleVibratePlayer(player.id)}
                          title="Vibrate phone"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-[10px] active:scale-95 transition"
                        >
                          <Vibrate className="w-3 h-3" />
                          <span>Buzz Phone</span>
                        </button>
                        <button
                          onClick={() => handleKickPlayer(player.id)}
                          title="Disconnect slot"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 font-mono text-[10px] active:scale-95 transition"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Kick</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono text-slate-500">Test Signal:</span>
                        <div className="flex gap-1">
                          <button
                            onMouseDown={() => handleSimulateButton(slot, 'red', true)}
                            onMouseUp={() => handleSimulateButton(slot, 'red', false)}
                            className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-800 text-red-300 border border-red-800 font-mono text-[9px] font-bold active:scale-95 transition"
                          >
                            Red
                          </button>
                          <button
                            onMouseDown={() => handleSimulateButton(slot, 'blue', true)}
                            onMouseUp={() => handleSimulateButton(slot, 'blue', false)}
                            className="px-1.5 py-0.5 rounded bg-blue-950 hover:bg-blue-800 text-blue-300 border border-blue-800 font-mono text-[9px] font-bold active:scale-95 transition"
                          >
                            1
                          </button>
                          <button
                            onMouseDown={() => handleSimulateButton(slot, 'orange', true)}
                            onMouseUp={() => handleSimulateButton(slot, 'orange', false)}
                            className="px-1.5 py-0.5 rounded bg-orange-950 hover:bg-orange-800 text-orange-300 border border-orange-800 font-mono text-[9px] font-bold active:scale-95 transition"
                          >
                            2
                          </button>
                          <button
                            onMouseDown={() => handleSimulateButton(slot, 'green', true)}
                            onMouseUp={() => handleSimulateButton(slot, 'green', false)}
                            className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-800 font-mono text-[9px] font-bold active:scale-95 transition"
                          >
                            3
                          </button>
                          <button
                            onMouseDown={() => handleSimulateButton(slot, 'yellow', true)}
                            onMouseUp={() => handleSimulateButton(slot, 'yellow', false)}
                            className="px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-800 text-amber-300 border border-amber-800 font-mono text-[9px] font-bold active:scale-95 transition"
                          >
                            4
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 pb-4 px-6 sm:px-8 border-t border-slate-800/90 flex flex-wrap justify-between items-center bg-black gap-4 text-xs">
        <div className="flex flex-wrap gap-5 text-[11px] font-mono text-slate-500 uppercase tracking-widest">
          <div className="flex gap-2 items-center">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_6px_#3b82f6]"></span>
            <span>Virtual Controller Node Matrix Active</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]"></span>
            <span>PCSX2 HID Ready</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBridgeModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-900/50 active:scale-95 transition"
          >
            PCSX2 Virtual Bridge Setup
          </button>
        </div>
      </footer>

      {/* PCSX2 Bridge Setup Modal */}
      <USBBridgeModal
        isOpen={showBridgeModal}
        onClose={() => setShowBridgeModal(false)}
        roomState={roomState}
      />

      {/* QR Code Phone Join Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        roomId={roomId}
      />
    </div>
  );
};
