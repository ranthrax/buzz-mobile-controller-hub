import { useState, useEffect } from 'react';
import { HostNetworkInterface, NetworkInfoResponse } from '../types';

export function isLocalHostAddress(hostOrHostname: string = window.location.hostname): boolean {
  const h = hostOrHostname.toLowerCase().split(':')[0];
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local')
  );
}

export async function fetchNetworkInfo(): Promise<NetworkInfoResponse | null> {
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) return null;
    return (await res.json()) as NetworkInfoResponse;
  } catch (err) {
    console.warn('Could not fetch network info:', err);
    return null;
  }
}

export function useNetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoResponse | null>(null);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const isLocalHost = typeof window !== 'undefined' ? isLocalHostAddress(window.location.hostname) : false;

  useEffect(() => {
    let mounted = true;
    fetchNetworkInfo().then((info) => {
      if (!mounted) return;
      if (info) {
        setNetworkInfo(info);
        if (info.primaryIp) {
          setSelectedIp(info.primaryIp);
        }
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Determine the effective host for phones to connect to
  const getEffectiveHost = (): string => {
    if (typeof window === 'undefined') return 'localhost:3000';

    if (isCustom && customIp.trim()) {
      const cleanIp = customIp.trim();
      const port = networkInfo?.port || window.location.port || '3000';
      return cleanIp.includes(':') ? cleanIp : `${cleanIp}:${port}`;
    }

    if (isLocalHost) {
      const activeIp = selectedIp || networkInfo?.primaryIp;
      if (activeIp) {
        const port = networkInfo?.port || window.location.port || '3000';
        return `${activeIp}:${port}`;
      }
    }

    // Default to the current window location host (e.g. if already accessing via LAN IP or public cloud domain)
    return window.location.host;
  };

  const getJoinUrl = (roomId: string): string => {
    if (typeof window === 'undefined') return '';
    const host = getEffectiveHost();
    const protocol = window.location.protocol;
    return `${protocol}//${host}/?mode=controller&room=${encodeURIComponent(roomId)}`;
  };

  const effectiveIp = isCustom && customIp.trim()
    ? customIp.trim()
    : selectedIp || networkInfo?.primaryIp || (isLocalHost ? '' : window.location.hostname);

  return {
    networkInfo,
    primaryIp: networkInfo?.primaryIp || null,
    interfaces: networkInfo?.interfaces || [],
    selectedIp: effectiveIp,
    setSelectedIp: (ip: string) => {
      setIsCustom(false);
      setSelectedIp(ip);
    },
    customIp,
    setCustomIp: (ip: string) => {
      setCustomIp(ip);
      setIsCustom(true);
    },
    isCustom,
    setIsCustom,
    isLocalHost,
    loading,
    getEffectiveHost,
    getJoinUrl,
  };
}
