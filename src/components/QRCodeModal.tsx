import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  Network,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Radio,
  Laptop,
} from 'lucide-react';
import { useNetworkInfo } from '../services/networkInfo';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, roomId }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingIp, setIsEditingIp] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');

  const {
    networkInfo,
    primaryIp,
    interfaces,
    selectedIp,
    setSelectedIp,
    customIp,
    setCustomIp,
    isCustom,
    isLocalHost,
    loading,
    getJoinUrl,
    getEffectiveHost,
  } = useNetworkInfo();

  const joinUrl = getJoinUrl(roomId);
  const effectiveHost = getEffectiveHost();

  useEffect(() => {
    if (isOpen && joinUrl) {
      QRCode.toDataURL(
        joinUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#020617',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyCustomIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      setCustomIp(customInput.trim());
      setIsEditingIp(false);
    }
  };

  return (
    <div
      id="qr-code-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col items-center text-center space-y-3.5 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <QrCode className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">Join with Phone</span>
              <span className="text-[11px] text-slate-400 font-mono">Scan QR to connect as buzzer</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network & IPv4 Status Banner */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-left space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-blue-400" />
                PC IPv4 Address
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCustomInput(selectedIp || '');
                  setIsEditingIp(!isEditingIp);
                }}
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 hover:bg-blue-900/60 transition"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingIp ? 'Cancel' : 'Change IP'}</span>
              </button>
            </div>
          </div>

          {/* Current Active Host / IP Display */}
          {!isEditingIp ? (
            <div className="flex items-baseline justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {effectiveHost}
                </span>
                {isLocalHost && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/60 font-mono font-semibold">
                    IPv4 LAN
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Port {networkInfo?.port || 3000}
              </span>
            </div>
          ) : (
            <form onSubmit={handleApplyCustomIp} className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. 192.168.1.50"
                className="flex-1 bg-slate-900 border border-blue-500/60 rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition"
              >
                Apply
              </button>
            </form>
          )}

          {/* Multiple Network Adapters Switcher */}
          {interfaces.length > 1 && !isEditingIp && (
            <div className="pt-1 border-t border-slate-850">
              <div className="text-[10px] text-slate-400 font-mono mb-1.5 flex items-center justify-between">
                <span>Select PC Network Adapter:</span>
                <span className="text-[9px] text-slate-500">{interfaces.length} available</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {interfaces.map((iface) => {
                  const isCurrent = selectedIp === iface.address && !isCustom;
                  return (
                    <button
                      key={`${iface.name}-${iface.address}`}
                      type="button"
                      onClick={() => setSelectedIp(iface.address)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-md border flex items-center gap-1.5 transition ${
                        isCurrent
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {iface.type === 'wifi' ? (
                        <Wifi className="w-3 h-3 text-blue-400" />
                      ) : (
                        <Network className="w-3 h-3 text-slate-400" />
                      )}
                      <span className="capitalize">{iface.name}:</span>
                      <span>{iface.address}</span>
                      {iface.isPrimary && (
                        <span className="text-[9px] text-emerald-400 font-bold">•</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clarification badge */}
          {isLocalHost && (
            <p className="text-[11px] text-slate-400 leading-snug">
              <span className="text-emerald-400 font-semibold">Native PC Mode:</span> This QR code uses your PC's local IPv4 instead of <code className="text-slate-300 font-mono">localhost</code> so mobile phones on your Wi-Fi can join.
            </p>
          )}
        </div>

        {/* QR Code Canvas */}
        <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-blue-600/30 transition-all hover:scale-[1.02]">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan QR to join as buzzer controller"
              className="w-52 h-52 sm:w-56 sm:h-56 rounded-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-52 h-52 sm:w-56 sm:h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Generating QR...</span>
            </div>
          )}
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 font-mono text-sm">
          <span className="text-slate-400 text-xs">Room Code:</span>
          <span className="font-black text-blue-400 text-base uppercase tracking-wider">{roomId}</span>
        </div>

        {/* Direct Link Copy Input */}
        <div className="w-full space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={joinUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono truncate focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleCopyUrl}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Wifi className="w-3 h-3 text-slate-500" />
              Must be on same Wi-Fi / Hotspot
            </span>

            <a
              href="/?mode=controller"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
            >
              <span>Test Controller Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
