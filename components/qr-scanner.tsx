"use client";

import { useEffect, useRef } from "react";

interface QrScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
}

// Parses forkit QR format: "forkit:<orderId>:<code>" or plain code
function parseQrValue(raw: string): string {
  if (raw.startsWith("forkit:")) {
    const parts = raw.split(":");
    return parts[2] || raw;
  }
  return raw.trim().toUpperCase();
}

export default function QrScanner({ onScan, onClose, title = "Scan QR Code" }: QrScannerProps) {
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2)}`).current;
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            const code = parseQrValue(decoded);
            scanner.stop().catch(() => {});
            onScan(code);
          },
          () => {}
        );
      } catch {
        // camera unavailable or permission denied — user can close
      }
    }

    start();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-gray-900">{title}</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            ✕
          </button>
        </div>
        <div id={regionId} className="w-full" />
        <p className="text-xs text-gray-400 text-center px-4 py-3">
          Point camera at the customer&apos;s QR code
        </p>
      </div>
    </div>
  );
}
