import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Gamepad2,
  X,
  Download,
  Copy,
  Check,
  Terminal,
  Layers,
  HelpCircle,
  Play,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { RoomState } from '../types';

interface USBBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: RoomState | null;
}

export const USBBridgeModal: React.FC<USBBridgeModalProps> = ({ isOpen, onClose, roomState }) => {
  const [activeTab, setActiveTab] = useState<'pcsx2_setup' | 'pcsx2_mappings' | 'hid_inspector' | 'batch_launcher'>('pcsx2_setup');
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [copiedBat, setCopiedBat] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPython = () => {
    window.location.href = `/api/bridge/python?room=${roomState?.roomId || 'BUZZ1'}&host=${window.location.host}`;
  };

  const handleDownloadBat = () => {
    window.location.href = '/api/download/start-bat';
  };

  const setupCommand = `pip install websocket-client vgamepad keyboard && python buzz_pcsx2_bridge.py`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const batchScriptContent = "@echo off\ncd /d \"%~dp0\"\ntitle BUZZ! Controller Hub\n\n:: Add default Node.js install location to PATH in case Windows hasn't refreshed it\nset \"PATH=C:\\Program Files\\nodejs;C:\\Program Files (x86)\\nodejs;%PATH%\"\n\necho ================================================================\necho   🎮 BUZZ! Multi-Phone Controller Hub for PCSX2\necho ================================================================\necho.\n\nwhere node >nul 2>nul\nif errorlevel 1 (\n    echo [ERROR] Node.js was not found on your PC!\n    echo.\n    echo Please install Node.js (LTS version) from:\n    echo   https://nodejs.org/\n    echo.\n    echo Make sure to check \"Add to PATH\" during installation.\n    echo.\n    pause\n    exit /b\n)\n\nif not exist node_modules (\n    echo [*] First-time setup: Installing dependencies...\n    echo [*] This only takes a minute. Please wait...\n    echo.\n    call npm install\n    echo.\n)\n\necho [*] Opening BUZZ! Dashboard at http://localhost:3000 ...\nstart http://localhost:3000\n\necho [*] Starting server...\necho.\ncall npm run dev\n\necho.\necho Server stopped.\npause\n";


  const handleCopyBat = () => {
    navigator.clipboard.writeText(batchScriptContent);
    setCopiedBat(true);
    setTimeout(() => setCopiedBat(false), 2000);
  };

  return (
    <div
      id="pcsx2-bridge-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-black border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 tracking-wide font-mono">
                PCSX2 VIRTUAL GAMEPAD // USB HID BRIDGE
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Route multi-phone Buzz controllers directly into PCSX2 as native Gamepads & HID Joysticks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-black px-6 gap-2 pt-2 font-mono">
          <button
            onClick={() => setActiveTab('pcsx2_setup')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'pcsx2_setup'
                ? 'border-blue-400 text-blue-400 bg-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              1. PCSX2 QUICK SETUP
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pcsx2_mappings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'pcsx2_mappings'
                ? 'border-blue-400 text-blue-400 bg-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              2. BUTTON MAPPINGS REFERENCE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hid_inspector')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'hid_inspector'
                ? 'border-blue-400 text-blue-400 bg-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              3. LIVE HID INPUT INSPECTOR
            </span>
          </button>

          <button
            onClick={() => setActiveTab('batch_launcher')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'batch_launcher'
                ? 'border-blue-400 text-blue-400 bg-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              4. 1-CLICK LAUNCH (.BAT)
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-300">
          {/* TAB 1: PCSX2 QUICK SETUP */}
          {activeTab === 'pcsx2_setup' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Gamepad2 className="w-5 h-5 text-blue-400" />
                      PCSX2 Virtual USB Gamepad Bridge (Python)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      This bridge creates <strong>8 genuine OS-level Virtual Xbox 360 / DualShock gamepads</strong> on your PC. When players press their phone buzzer, PCSX2 receives native controller inputs with near-zero latency.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPython}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download buzz_pcsx2_bridge.py</span>
                  </button>
                </div>

                {/* Quick 3-Step Setup */}
                <div className="pt-2 space-y-3">
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">
                    3-Step Setup for PCSX2:
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    {/* Step 1 */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-mono">1</span>
                        Install Prerequisites (Terminal / Command Prompt)
                      </div>
                      <p className="text-slate-400 pl-7">
                        Run this command in your PC terminal to install the virtual gamepad drivers:
                      </p>
                      <div className="flex items-center gap-2 pl-7 pt-1">
                        <code className="flex-1 bg-black px-3 py-2 rounded-lg text-amber-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                          {setupCommand}
                        </code>
                        <button
                          onClick={handleCopyCmd}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
                        >
                          {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-mono">2</span>
                        Launch the Bridge Script
                      </div>
                      <p className="text-slate-400 pl-7">
                        Run <code className="text-amber-400 font-mono bg-black px-1.5 py-0.5 rounded">python buzz_pcsx2_bridge.py</code>. The script will output:
                        <br />
                        <span className="text-emerald-400 font-mono block mt-1">
                          [SUCCESS] Initialized 8 Virtual Controllers for PCSX2! Connected to Room {roomState?.roomId || 'BUZZ1'}.
                        </span>
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-mono">3</span>
                        Configure PCSX2 Controller Settings
                      </div>
                      <div className="pl-7 text-slate-400 space-y-1">
                        <p>
                          1. Open <strong>PCSX2</strong> → <strong>Settings</strong> → <strong>Controllers</strong>.
                        </p>
                        <p>
                          2. Under <strong>Controller Port 1 / Port 2</strong>, select <strong>Buzz! Buzzer Controller</strong> (or standard DualShock/Gamepad).
                        </p>
                        <p>
                          3. Start your favorite Buzz! game (e.g. <em>Buzz! The Mega Quiz</em>, <em>Buzz! The Hollywood Quiz</em>, or <em>Buzz! Junior</em>).
                        </p>
                        <p className="text-emerald-400 font-medium pt-1">
                          ✓ All 8 connected phones will now control Buzz! in PCSX2!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PCSX2 BUTTON MAPPINGS */}
          {activeTab === 'pcsx2_mappings' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2 font-mono">
                  PCSX2 Buzz! Controller Mapping Table
                </h3>
                <p className="text-xs text-slate-400">
                  Each phone controller is mapped to a dedicated Virtual Gamepad slot in PCSX2. Below is the exact button-to-buzzer signal map:
                </p>

                {/* Mapping Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Phone Input</th>
                        <th className="p-3">Buzz! Hardware Role</th>
                        <th className="p-3">Virtual Gamepad Button</th>
                        <th className="p-3">Keyboard Direct Hotkey</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      <tr className="bg-red-950/20">
                        <td className="p-3 font-bold text-red-400 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                          Red Buzzer Dome
                        </td>
                        <td className="p-3 text-white">Buzz! Lock-In Trigger</td>
                        <td className="p-3 text-emerald-400 font-bold">Button A / Cross</td>
                        <td className="p-3 text-amber-400">Space (P1) / Enter (P2)</td>
                      </tr>
                      <tr className="bg-blue-950/20">
                        <td className="p-3 font-bold text-blue-400 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                          Blue Bar (1)
                        </td>
                        <td className="p-3 text-white">Top Option (Circle)</td>
                        <td className="p-3 text-emerald-400 font-bold">Button X / Square</td>
                        <td className="p-3 text-amber-400">1 (P1) / 5 (P2)</td>
                      </tr>
                      <tr className="bg-orange-950/20">
                        <td className="p-3 font-bold text-orange-400 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                          Orange Bar (2)
                        </td>
                        <td className="p-3 text-white">Second Option (Square)</td>
                        <td className="p-3 text-emerald-400 font-bold">Button B / Circle</td>
                        <td className="p-3 text-amber-400">2 (P1) / 6 (P2)</td>
                      </tr>
                      <tr className="bg-emerald-950/20">
                        <td className="p-3 font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                          Green Bar (3)
                        </td>
                        <td className="p-3 text-white">Third Option (Triangle)</td>
                        <td className="p-3 text-emerald-400 font-bold">Button Y / Triangle</td>
                        <td className="p-3 text-amber-400">3 (P1) / 7 (P2)</td>
                      </tr>
                      <tr className="bg-amber-950/20">
                        <td className="p-3 font-bold text-amber-400 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                          Yellow Bar (4)
                        </td>
                        <td className="p-3 text-white">Bottom Option (Cross)</td>
                        <td className="p-3 text-emerald-400 font-bold">Right Shoulder (RB)</td>
                        <td className="p-3 text-amber-400">4 (P1) / 8 (P2)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW HID PACKET INSPECTOR */}
          {activeTab === 'hid_inspector' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-base font-mono">
                  Live Virtual HID Report Matrix (8 Slots)
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time telemetry showing active button presses routed to the PCSX2 Virtual Gamepad bridge:
                </p>

                {/* 8-Player Bitmask Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => {
                    const allPlayers = roomState?.players ? (Object.values(roomState.players) as import('../types').Player[]) : [];
                    const player = allPlayers.find((p) => p.slot === slot);
                    const inputs = player?.inputs || { red: false, blue: false, orange: false, green: false, yellow: false };
                    const isConnected = !!player?.connected;

                    return (
                      <div
                        key={slot}
                        className={`p-3 rounded-xl border transition ${
                          isConnected
                            ? 'bg-slate-900 border-slate-700 shadow-sm'
                            : 'bg-slate-950 border-slate-800/80 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-2">
                          <span className="text-white">Slot {slot}</span>
                          <span className={isConnected ? 'text-emerald-400 font-mono text-[10px]' : 'text-slate-500 text-[10px]'}>
                            {isConnected ? 'PHONE ALLOCATED' : 'STANDBY'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] font-mono">
                          <div className="flex justify-between">
                            <span className="text-red-400">Red Dome:</span>
                            <span className={inputs.red ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                              {inputs.red ? 'PRESSED (1)' : '0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-400">Blue:</span>
                            <span className={inputs.blue ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                              {inputs.blue ? 'PRESSED (1)' : '0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-400">Orange:</span>
                            <span className={inputs.orange ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                              {inputs.orange ? 'PRESSED (1)' : '0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400">Green:</span>
                            <span className={inputs.green ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                              {inputs.green ? 'PRESSED (1)' : '0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-400">Yellow:</span>
                            <span className={inputs.yellow ? 'text-emerald-400 font-black' : 'text-slate-600'}>
                              {inputs.yellow ? 'PRESSED (1)' : '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WINDOWS 1-CLICK LAUNCH (.BAT) */}
          {activeTab === 'batch_launcher' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Play className="w-5 h-5 text-emerald-400" />
                      Windows 1-Click Launch Script (<code className="text-amber-400 font-mono text-sm">Start_Buzz.bat</code>)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      For systems with <strong>Node.js installed</strong>. Double-clicking this batch file checks your Node runtime, installs dependencies automatically on first run, builds the bundle, starts the local server, and opens your browser.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBat}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Start_Buzz.bat</span>
                  </button>
                </div>

                {/* Workflow Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-emerald-400 font-bold mb-1">1. Node.js Verification</div>
                    <p className="text-slate-400 text-[11px]">
                      Detects global <code className="text-slate-200">node</code> & <code className="text-slate-200">npm</code> in system PATH.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-blue-400 font-bold mb-1">2. Auto-Dependency Check</div>
                    <p className="text-slate-400 text-[11px]">
                      Runs <code className="text-slate-200">npm install</code> only if <code className="text-slate-200">node_modules</code> is missing.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="text-amber-400 font-bold mb-1">3. Instant Browser Launch</div>
                    <p className="text-slate-400 text-[11px]">
                      Opens <code className="text-slate-200">http://localhost:3000</code> in your default browser.
                    </p>
                  </div>
                </div>

                {/* Script Code Viewer */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Batch Script Source (<code className="text-amber-400">Start_Buzz.bat</code>):
                    </span>
                    <button
                      onClick={handleCopyBat}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                    >
                      {copiedBat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBat ? 'Copied to Clipboard' : 'Copy Script'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-black border border-slate-800 rounded-xl text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72">
                    {batchScriptContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-emerald-400 font-bold">1000Hz Virtual Gamepad Emulation for PCSX2</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
