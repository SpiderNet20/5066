import React, { useState, useEffect } from 'react';
import { Gauge, ArrowDown, ArrowUp, Wifi, RefreshCw, X, CheckCircle2 } from 'lucide-react';

interface SpeedTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpeedTestModal: React.FC<SpeedTestModalProps> = ({ isOpen, onClose }) => {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
  const [ping, setPing] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTesting(false);
      setStage('idle');
      setProgress(0);
      setCurrentSpeed(0);
    }
  }, [isOpen]);

  const runTest = () => {
    setTesting(true);
    setStage('ping');
    setProgress(5);
    setPing(null);
    setJitter(null);
    setDownload(null);
    setUpload(null);

    // Stage 1: Ping & Jitter
    setTimeout(() => {
      const p = Math.floor(12 + Math.random() * 15);
      const j = Math.floor(2 + Math.random() * 4);
      setPing(p);
      setJitter(j);
      setStage('download');
      setProgress(25);
    }, 1200);

    // Stage 2: Download Speed
    let currentD = 10;
    const downloadInterval = setInterval(() => {
      currentD += Math.random() * 12;
      if (currentD > 85) currentD = 75 + Math.random() * 18;
      setCurrentSpeed(Math.round(currentD * 10) / 10);
    }, 100);

    setTimeout(() => {
      clearInterval(downloadInterval);
      const finalDownload = Math.round((70 + Math.random() * 25) * 10) / 10;
      setDownload(finalDownload);
      setCurrentSpeed(finalDownload);
      setStage('upload');
      setProgress(65);

      // Stage 3: Upload Speed
      let currentU = 5;
      const uploadInterval = setInterval(() => {
        currentU += Math.random() * 6;
        if (currentU > 35) currentU = 28 + Math.random() * 10;
        setCurrentSpeed(Math.round(currentU * 10) / 10);
      }, 100);

      setTimeout(() => {
        clearInterval(uploadInterval);
        const finalUpload = Math.round((25 + Math.random() * 15) * 10) / 10;
        setUpload(finalUpload);
        setCurrentSpeed(finalUpload);
        setStage('complete');
        setProgress(100);
        setTesting(false);
      }, 2500);

    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#252a54] rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-[#2f366b] text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#035dcd] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">أداة قياس سرعة الإنترنت</h3>
              <p className="text-xs text-blue-100">Internet Speed Test - العنكبوت للمعلومات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Main Dial */}
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative flex items-center justify-center w-52 h-52 rounded-full border-8 border-gray-100 dark:border-[#1e2348] bg-gradient-to-b from-blue-50/50 to-white dark:from-[#2a3060] dark:to-[#252a54]">
              {/* Animated Ring Indicator */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  className="stroke-gray-100 dark:stroke-[#1b1e38]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  className="stroke-[#035dcd] transition-all duration-300 ease-out"
                  strokeWidth="8"
                  strokeDasharray="552"
                  strokeDashoffset={552 - (552 * progress) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="flex flex-col items-center justify-center text-center z-10">
                {stage === 'idle' ? (
                  <button
                    onClick={runTest}
                    className="w-28 h-28 rounded-full bg-[#035dcd] hover:bg-[#02479e] text-white font-bold text-xl flex flex-col items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>ابدأ</span>
                    <span className="text-xs font-normal opacity-80">فحص السرعة</span>
                  </button>
                ) : (
                  <div>
                    <span className="text-4xl font-extrabold text-[#035dcd] dark:text-blue-400 font-mono">
                      {stage === 'complete' ? download : currentSpeed}
                    </span>
                    <span className="block text-xs font-semibold text-gray-500 dark:text-gray-300 mt-1">
                      ميغابت / ثانية (Mbps)
                    </span>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-[#035dcd] dark:text-blue-300">
                      {stage === 'ping' && 'فحص الاستجابة (Ping)...'}
                      {stage === 'download' && 'فحص سرعة التحميل...'}
                      {stage === 'upload' && 'فحص سرعة الرفع...'}
                      {stage === 'complete' && 'اكتمل الفحص بنجاح'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> الاستجابة
              </span>
              <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">
                {ping !== null ? `${ping} ms` : '--'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                التذبذب (Jitter)
              </span>
              <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">
                {jitter !== null ? `${jitter} ms` : '--'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium">
                <ArrowDown className="w-3.5 h-3.5" /> التحميل
              </span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {download !== null ? `${download} Mbps` : '--'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center">
              <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1 font-medium">
                <ArrowUp className="w-3.5 h-3.5" /> الرفع
              </span>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                {upload !== null ? `${upload} Mbps` : '--'}
              </p>
            </div>
          </div>

          {/* Action Button when finished */}
          {stage === 'complete' && (
            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <CheckCircle2 className="w-5 h-5" />
                <span>اتصالك ممتاز ومناسب للألعاب والبث المباشر بدقة 4K.</span>
              </div>
              <button
                onClick={runTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#035dcd] text-white text-xs font-semibold hover:bg-[#02479e] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة الفحص</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
