import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Lock,
  User,
  Phone,
  Droplet,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import QRCode from 'qrcode';
import { useAuth } from '@raah/auth';
import { curaCardApi, patientsApi } from '@raah/api-client';
import type { CuraCardDetails, PatientMedicalProfile } from '@raah/shared-types';

export const CuraCardPage: React.FC = () => {
  const { profile, isLoading: isAuthLoading } = useAuth();

  const [cardDetails, setCardDetails] = useState<CuraCardDetails | null>(null);
  const [medicalProfile, setMedicalProfile] = useState<PatientMedicalProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const [isLoadingCard, setIsLoadingCard] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);

  // Render QR from payload
  const renderQr = useCallback(async (payload: string) => {
    try {
      const qrFn = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL;
      if (!qrFn) throw new Error('QRCode generator not available');
      const url = await qrFn(payload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl(null);
    }
  }, []);

  // Update countdown
  const startCountdown = useCallback((expiresAtStr: string) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const targetTime = new Date(expiresAtStr).getTime();
    const updateTime = () => {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setQrDataUrl(null);
      }
    };

    updateTime();
    countdownIntervalRef.current = window.setInterval(updateTime, 1000);
  }, []);

  // Load card and medical profile
  const fetchCardData = useCallback(async () => {
    setIsLoadingCard(true);
    setErrorMsg(null);
    try {
      const [cardResult, medResult] = await Promise.allSettled([
        curaCardApi.getMe(),
        patientsApi.getMe(),
      ]);

      if (cardResult.status === 'fulfilled') {
        const card = cardResult.value;
        setCardDetails(card);

        if (card.hasActiveToken && card.expiresAt && new Date(card.expiresAt) > new Date()) {
          startCountdown(card.expiresAt);
        } else {
          setQrDataUrl(null);
          setRemainingSeconds(0);
        }
      } else {
        const error = cardResult.reason as { message?: string };
        setErrorMsg(error?.message || 'Failed to load Cura Card credentials.');
      }

      if (medResult.status === 'fulfilled') {
        setMedicalProfile(medResult.value);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Failed to load Cura Card credentials.');
    } finally {
      setIsLoadingCard(false);
    }
  }, [startCountdown]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (profile) {
        fetchCardData();
      } else {
        setIsLoadingCard(false);
      }
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthLoading, profile, fetchCardData]);

  // Generate / Refresh QR Token
  const handleGenerateToken = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await curaCardApi.generateToken();
      setCardDetails((prev) =>
        prev
          ? {
              ...prev,
              cardId: res.cardId,
              status: 'ACTIVE',
              hasActiveToken: true,
              expiresAt: res.expiresAt,
            }
          : null,
      );

      await renderQr(res.qrPayload);
      startCountdown(res.expiresAt);
      setSuccessMsg('Fresh cryptographic QR token generated (valid for 5 minutes).');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Failed to generate secure QR token.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Revoke Active Token
  const handleRevokeToken = async () => {
    setIsRevoking(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await curaCardApi.revokeToken();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setQrDataUrl(null);
      setRemainingSeconds(0);
      setCardDetails((prev) =>
        prev
          ? {
              ...prev,
              status: 'REVOKED',
              hasActiveToken: false,
              expiresAt: null,
            }
          : null,
      );
      setSuccessMsg('Cura Card QR token revoked immediately.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMsg(error.message || 'Failed to revoke token.');
    } finally {
      setIsRevoking(false);
    }
  };

  if (isAuthLoading || isLoadingCard) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-96 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-200">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Patient Authentication Required</h2>
        <p className="text-sm text-slate-600">
          Your Digital Cura Card is cryptographically tied to your verified patient identity. Please sign in to access or generate your secure emergency QR code.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-sm"
          >
            <span>Sign In to Cura Card</span>
          </Link>
        </div>
      </div>
    );
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTokenActive = remainingSeconds > 0 && Boolean(qrDataUrl);

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-8 space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-600" />
            <span>Digital Health Credential</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Digital Cura Card
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-resistant emergency healthcare credential for authorized paramedic and hospital triage identification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/medical-profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <span>Medical Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Feedback alerts */}
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. The Physical-Style Digital Cura Card */}
      <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700/30 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
          <Shield className="w-96 h-96" />
        </div>

        {/* Card Header Strip */}
        <div className="p-6 sm:p-8 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <Shield className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-sky-300 uppercase block">
                Emergency Health ID • RAAH-CARE Network
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                CURA CARD
              </h2>
            </div>
          </div>

          <div className="text-right">
            {isTokenActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                <span>QR ACTIVE • {formatCountdown(remainingSeconds)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-xs">
                <Lock className="w-3 h-3 text-amber-300" />
                <span>TOKEN INACTIVE</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Body Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Left 2 Cols: Patient Info */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Patient Full Name</span>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{profile?.name || 'Verified Patient'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Permanent Card ID
                </span>
                <p className="font-mono text-sky-300 font-bold mt-1 text-sm tracking-wide">
                  {cardDetails?.cardId || medicalProfile?.cardId || 'RAAH-CR-PENDING'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Emergency Phone
                </span>
                <p className="font-semibold text-white mt-1">
                  {medicalProfile?.emergencyContact || profile?.phone || 'Not registered'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-rose-400" /> Blood Group
                </span>
                <p className="font-bold text-rose-300 mt-1">
                  {medicalProfile?.bloodGroup || cardDetails?.bloodGroup || 'Not Specified'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> Known Allergies
                </span>
                <p className="font-semibold text-amber-200 mt-1 truncate">
                  {medicalProfile?.allergies || cardDetails?.allergies || 'None Recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Col: QR Code Display / Token Status */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
            {isTokenActive && qrDataUrl ? (
              <div className="space-y-2 flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl shadow-lg">
                  <img
                    src={qrDataUrl}
                    alt="Cura Card Emergency QR"
                    className="w-36 h-36 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-300 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {formatCountdown(remainingSeconds)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="p-3 bg-white/10 rounded-2xl text-slate-400 inline-block">
                  <QrCode className="w-12 h-12" />
                </div>
                <p className="text-xs font-bold text-slate-200">No Active QR Token</p>
                <p className="text-[10px] text-slate-400 max-w-[160px] leading-relaxed">
                  Generate an ephemeral 5-minute QR code when presenting for responder scan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Action Bar */}
        <div className="px-6 sm:px-8 py-4 bg-slate-950/60 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-slate-400 text-[11px]">
            Server tokens expire in 5 minutes • Re-generate on presentation
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isTokenActive && (
              <button
                type="button"
                onClick={handleRevokeToken}
                disabled={isRevoking}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600/30 text-rose-300 hover:bg-rose-600/40 border border-rose-500/30 font-bold transition flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isRevoking ? 'Revoking...' : 'Revoke QR'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateToken}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black transition shadow-sm flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isTokenActive ? 'Refresh QR Token' : 'Generate QR Code'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
