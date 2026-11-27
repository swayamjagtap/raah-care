import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, User, Phone, Droplet, ShieldAlert, CheckCircle2, Clock, QrCode, RefreshCw, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import type { AuthenticatedUserProfile } from '@raah/shared-types';
import { curaCardApi, patientsApi } from '@raah/api-client';

interface CuraCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AuthenticatedUserProfile | null;
}

export const CuraCardModal: React.FC<CuraCardModalProps> = ({ isOpen, onClose, profile }) => {
  const [cardId, setCardId] = useState<string>('RAAH-CR-PENDING');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const countdownIntervalRef = useRef<number | null>(null);

  const startCountdown = useCallback((expiresAtStr: string) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    const target = new Date(expiresAtStr).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setQrDataUrl(null);
      }
    };
    tick();
    countdownIntervalRef.current = window.setInterval(tick, 1000);
  }, []);

  useEffect(() => {
    if (isOpen && profile) {
      curaCardApi
        .getMe()
        .then((card) => {
          setCardId(card.cardId);
          if (card.hasActiveToken && card.expiresAt && new Date(card.expiresAt) > new Date()) {
            startCountdown(card.expiresAt);
          }
        })
        .catch(() => {});

      patientsApi
        .getMe()
        .then((med) => {
          if (med.cardId) setCardId(med.cardId);
          setBloodGroup(med.bloodGroup || null);
          setAllergies(med.allergies || null);
        })
        .catch(() => {});
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, profile, startCountdown]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await curaCardApi.generateToken();
      setCardId(res.cardId);
      const url = await QRCode.toDataURL(res.qrPayload, { width: 200, margin: 2 });
      setQrDataUrl(url);
      startCountdown(res.expiresAt);
    } catch {
      // Handled silently in modal
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async () => {
    try {
      await curaCardApi.revokeToken();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setQrDataUrl(null);
      setRemainingSeconds(0);
    } catch {
      // Ignored
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
            <Shield className="w-40 h-40" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-sky-400" />
              <h3 className="font-extrabold tracking-wide uppercase text-xs text-sky-300">
                Digital Cura Card • RAAH-CARE
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white text-xl font-bold p-1 rounded-lg focus:outline-hidden"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>

          <div className="mt-5 relative z-10">
            <p className="text-[11px] text-slate-300 font-medium">Digital Patient Identification</p>
            <h2 className="text-2xl font-black tracking-tight mt-0.5 text-white">{profile?.name || 'Verified Patient'}</h2>
            <p className="text-[11px] text-sky-200 mt-1 font-mono">ID: {cardId}</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {/* QR Display */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            {qrDataUrl && remainingSeconds > 0 ? (
              <div className="space-y-2 flex flex-col items-center">
                <img src={qrDataUrl} alt="Cura Card QR" className="w-32 h-32 rounded-lg bg-white p-1 shadow" />
                <span className="text-xs font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Expires in {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">QR Code Inactive</p>
                <p className="text-[10px] text-slate-500 max-w-[200px]">
                  Generate a 5-minute ephemeral QR code when presenting to paramedics or emergency staff.
                </p>
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </span>
              <span className="font-bold text-slate-800">{profile?.name}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Contact Phone
              </span>
              <span className="font-bold text-slate-800">{profile?.phone || 'Not registered'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-500" /> Blood Group
              </span>
              <span className="font-bold text-rose-700">{bloodGroup || 'Not Specified'}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Allergies
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[200px]">{allergies || 'None Reported'}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-slate-500">Security Verification</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Identity Verified
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            {qrDataUrl && (
              <button
                type="button"
                onClick={handleRevoke}
                className="flex-1 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{qrDataUrl ? 'Refresh QR' : 'Generate QR Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
