import React, { useState, useRef } from 'react';
import { Upload, Copy, Check, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { adminUploadImage } from '../../services/postsService';

interface MediaItem {
  url: string;
  name: string;
  date: string;
}

export const MediaManager: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([
    {
      url: '/logo-spider.png',
      name: 'شعار العنكبوت للمعلومات الرسمي',
      date: 'الأصل',
    },
    {
      url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiBt6t1Nd4_DNrsmBIezXuzZDslivOpWBXRUPQFBxsKwjvac7GzVpjhXTq0HyEuUgo2UAQDqNlwrkqJgjqLdnnehO2XBxLRk1ENTQN-ZitgvdzTxg48XYZKRigrA74BXiuZYTnbn9YvCfhsuYl9gky2JsQ-cB8QkQLQm9KLWLDYAntZ7lPtIDc33qt6Uvt6/s1600/b126305a-24d3-4ab4-ab82-d81f3ed7feb7.png',
      name: 'صورة الشعار المعتمدة من بلوجر',
      date: 'الأصل',
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, GIF, SVG)');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await adminUploadImage(base64Data, file.name, file.type);
        setMediaList((prev) => [
          {
            url: res.url,
            name: file.name,
            date: new Date().toLocaleTimeString('ar-EG'),
          },
          ...prev,
        ]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل رفع الصورة');
      setIsUploading(false);
    }
  };

  const copyToClipboard = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="space-y-6 font-['Tajawal',sans-serif]" dir="rtl">
      {/* Upload Zone Card */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#035dcd]">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              رفع صور جديدة لمكتبة الموقع
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              اسحب وأفلت الصور هنا، أو اضغط للتصفح من جهازك (PNG, JPG, WebP, SVG حتى 10MB)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-3 rounded-xl bg-[#035dcd] hover:bg-[#0249a3] text-white text-sm font-bold shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الرفع على الخادم...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>اختيار صورة من الجهاز</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Media Grid */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#035dcd]" />
            <span>الصور المرفوعة والمتاحة ({mediaList.length})</span>
          </h3>
          <span className="text-xs text-gray-400">
            اضغط على زر النسخ لاستخدام رابط الصورة داخل المقالات
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mediaList.map((item, idx) => (
            <div
              key={idx}
              className="group border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/40 hover:border-[#035dcd] transition flex flex-col"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden p-2 relative">
                <img
                  src={item.url}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain transition group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo-spider.png';
                  }}
                />
              </div>
              <div className="p-3 text-xs flex-1 flex flex-col justify-between border-t border-gray-100 dark:border-gray-700/60">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate mb-1" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400">{item.date}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.url)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#035dcd] hover:underline"
                    title="نسخ الرابط"
                  >
                    {copiedUrl === item.url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
