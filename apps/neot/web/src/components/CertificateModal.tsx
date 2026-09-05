import React, { useState } from 'react';
import { Award, CheckCircle, Copy, Check, Printer, X, ShieldCheck } from 'lucide-react';
import type { LearningCertificate, LearningCourse } from '../types.js';

interface CertificateModalProps {
  certificate: LearningCertificate;
  course?: LearningCourse;
  studentName?: string;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  certificate,
  course,
  studentName = 'Student of NEOT',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(certificate.certificateCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Top Action Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            <ShieldCheck className="w-4 h-4" />
            <span>NEOT Verifiable Academic Credential</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Styled for Printing & Display) */}
        <div className="p-8 sm:p-12 text-center relative overflow-hidden bg-gradient-to-b from-teal-500/5 via-transparent to-emerald-500/5 print:p-8">
          {/* Subtle Decorative Borders */}
          <div className="absolute inset-3 border-2 border-dashed border-teal-500/20 dark:border-teal-400/20 rounded-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Seal / Badge */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 mb-6">
              <Award className="w-10 h-10" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
              Certificate of Mastery & Completion
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white mt-2 mb-1">
              {studentName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              has satisfactorily completed and demonstrated domain proficiency in
            </p>

            <div className="py-2 px-6 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 inline-block">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {course?.title ?? 'Advanced Study Curriculum'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {course?.code ?? 'neot-lms-program'} &bull; Grade: {certificate.gradePercentage}%
              </p>
            </div>

            {/* Signatures & Issue date */}
            <div className="w-full grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="text-left">
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Issued Date</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">{formattedDate}</p>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1">Provider: NEOT Study Management</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase">Validation Code</p>
                <div className="flex items-center justify-end gap-1.5 font-mono font-semibold text-teal-600 dark:text-teal-400">
                  <span>{certificate.certificateCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-[9px] mt-1 font-mono truncate max-w-[200px] ml-auto" title={certificate.verificationHash}>
                  SHA256: {certificate.verificationHash.slice(0, 16)}...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Cryptographically Verified against neot.in</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
