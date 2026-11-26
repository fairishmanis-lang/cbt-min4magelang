import React from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

interface ExamViolationModalProps {
  isLocked: boolean;
  lockedReason?: string;
  violationCount: number;
  maxViolations?: number;
  warningOpen: boolean;
  onDismissWarning: () => void;
  onRefreshLockStatus?: () => void;
  isCheckingStatus?: boolean;
}

export const ExamViolationModal: React.FC<ExamViolationModalProps> = ({
  isLocked,
  lockedReason,
  violationCount,
  maxViolations = 3,
  warningOpen,
  onDismissWarning,
  onRefreshLockStatus,
  isCheckingStatus = false,
}) => {
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Sesi Ujian Terkunci
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {lockedReason ||
              'Anda telah keluar atau berpindah tab/aplikasi sebanyak 3 kali.'}
          </p>
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
            Pelanggaran tercatat: {violationCount} / {maxViolations}. Silakan hubungi guru atau pengawas ujian untuk membuka kunci sesi Anda.
          </div>

          {onRefreshLockStatus && (
            <button
              type="button"
              onClick={onRefreshLockStatus}
              disabled={isCheckingStatus}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isCheckingStatus ? 'Memeriksa status...' : 'Cek Status Buka Kunci'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!warningOpen) return null;

  const remaining = Math.max(maxViolations - violationCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Peringatan Pindah Tab / Aplikasi
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sistem mendeteksi Anda meninggalkan halaman ujian. Pelanggaran ke-
          <span className="font-semibold text-slate-900">{violationCount}</span> dari{' '}
          <span className="font-semibold text-slate-900">{maxViolations}</span> telah dicatat.
        </p>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Sisa toleransi: {remaining}x lagi. Jika mencapai {maxViolations}x, sesi ujian akan terkunci otomatis hingga dibuka oleh guru.
        </p>

        <button
          type="button"
          onClick={onDismissWarning}
          className="mt-5 w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          Saya Mengerti & Lanjutkan Ujian
        </button>
      </div>
    </div>
  );
};
