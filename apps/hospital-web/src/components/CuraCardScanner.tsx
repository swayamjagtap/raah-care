import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  QrCode,
  ShieldAlert,
  Droplet,
  HeartPulse,
  Pill,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { curaCardApi } from '@raah/api-client';
import type { ResponderPatientMedicalRecord } from '@raah/shared-types';

export function extractCuraCardToken(payload: string): string {
  const trimmed = payload.trim();
  if (!trimmed) return '';

  if (trimmed.includes('token=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://localhost/${trimmed}`);
      const token = url.searchParams.get('token');
      if (token) return token.trim();
    } catch {
      const match = trimmed.match(/[?&]token=([a-fA-F0-9]+)/);
      if (match?.[1]) return match[1].trim();
    }
  }

  const pathMatch = trimmed.match(/\/(?:c|cura-card|token)\/([a-fA-F0-9]{32,64})/i);
  if (pathMatch?.[1]) {
    return pathMatch[1].trim();
  }

  return trimmed;
}

interface CuraCardScannerProps {
  portalRole: 'PARAMEDIC' | 'DOCTOR';
  activeCaseId?: string;
  onRecordResolved?: (record: ResponderPatientMedicalRecord) => void;
}

export const CuraCardScanner: React.FC<CuraCardScannerProps> = ({
  portalRole,
  activeCaseId,
  onRecordResolved,
}) => {
  const [manualToken, setManualToken] = useState<string>('');
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resolvedRecord, setResolvedRecord] = useState<ResponderPatientMedicalRecord | null>(null);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleResolve = useCallback(async (tokenToResolve: string) => {
    const raw = extractCuraCardToken(tokenToResolve);
    if (!raw) {
      setErrorMsg('Please enter or scan a valid QR token.');
      return;
    }

    setIsResolving(true);
    setErrorMsg(null);
    try {
      const record = await curaCardApi.resolveToken({
        token: raw,
        caseId: activeCaseId,
      });
      setResolvedRecord(record);
      stopCamera();
      if (onRecordResolved) {
        onRecordResolved(record);
      }
    } catch (err: unknown) {
      const error = err as { message?: string; statusCode?: number };
      setErrorMsg(
        error.message ||
          'Failed to resolve Cura Card QR token. Verify token is active and not expired.',
      );
    } finally {
      setIsResolving(false);
    }
  }, [activeCaseId, onRecordResolved, stopCamera]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            const token = extractCuraCardToken(code.data);
            if (token) {
              handleResolve(token);
              return;
            }
          }
        } catch {
          // Frame read skipped in mock or security context
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleResolve]);

  const startCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      const error = err as { message?: string; name?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera access in browser settings or use manual token entry below.',
        );
      } else {
        setCameraError(
          error.message || 'Unable to access video camera. Please use manual token entry.',
        );
      }
      setIsCameraActive(false);
    }
  };

  const handleReset = () => {
    setResolvedRecord(null);
    setErrorMsg(null);
    setManualToken('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200 mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Emergency Triage Scanner • {portalRole}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cura Card Verification Scanner
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Scan patient ephemeral QR code or enter token to securely retrieve emergency clinical baseline.
          </p>
        </div>

        {resolvedRecord && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Another Card</span>
          </button>
        )}
      </div>

      {/* Error Feedback */}
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Resolved Record Display */}
      {resolvedRecord ? (
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-700 uppercase font-bold">
                  Verified Clinical Record
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {resolvedRecord.fullName}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {resolvedRecord.cardId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5" /> Blood Group
              </span>
              <p className="text-lg font-black text-rose-900 mt-1">
                {resolvedRecord.bloodGroup || 'Not Specified'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-amber-800 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Critical Allergies
              </span>
              <p className="font-bold text-amber-950 mt-1">
                {resolvedRecord.allergies || 'No allergies recorded'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
              <span className="text-sky-800 font-bold flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-sky-600" /> Pre-existing Conditions
              </span>
              <p className="font-semibold text-sky-950 mt-1">
                {resolvedRecord.medicalHistory || 'None recorded'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="text-indigo-800 font-bold flex items-center gap-1">
                <Pill className="w-3.5 h-3.5 text-indigo-600" /> Current Medications
              </span>
              <p className="font-semibold text-indigo-950 mt-1">
                {resolvedRecord.currentMedication || 'None recorded'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Emergency Contact
              </span>
              <p className="font-bold text-slate-800 mt-1">
                {resolvedRecord.emergencyContact || 'No emergency contact provided'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <span className="text-slate-600 font-bold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Verification Timestamp
              </span>
              <p className="font-mono text-slate-700 mt-1 text-[11px]">
                {new Date(resolvedRecord.verifiedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Scanning Interface */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Scanner View */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" />
                <span>Live Camera Scanner</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Point device camera directly at patient’s active Cura Card QR code.
              </p>
            </div>

            {/* Video Viewport */}
            <div className="w-full h-56 rounded-2xl bg-slate-900 relative overflow-hidden flex items-center justify-center text-white">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
                  <div className="absolute inset-0 border-2 border-dashed border-sky-400/70 m-8 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                    <span className="text-[10px] uppercase font-mono tracking-widest bg-slate-900/80 px-2 py-0.5 rounded text-sky-200">
                      Align QR Inside Target
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 space-y-2">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">Camera Inactive</p>
                  {cameraError && (
                    <p className="text-[11px] text-rose-300 max-w-xs">{cameraError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual Token Entry Fallback */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-600" />
                <span>Manual Token Entry Fallback</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter scanned URL or raw 64-character token when camera is unavailable.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleResolve(manualToken);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="manual-token" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  QR Token or Scan URL
                </label>
                <textarea
                  id="manual-token"
                  rows={4}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste scanned payload or token..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isResolving || !manualToken.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResolving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Backend...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolve Emergency Record</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
