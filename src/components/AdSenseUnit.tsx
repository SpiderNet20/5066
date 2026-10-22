import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export type AdSlotType = 'top' | 'middle' | 'bottom';

interface AdSenseUnitProps {
  slotType: AdSlotType;
  postId?: string | number;
  className?: string;
}

export const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  slotType,
  postId,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    // Small delay to ensure the DOM element is fully rendered and has layout width
    timer = setTimeout(() => {
      try {
        if (typeof window !== 'undefined') {
          const adsbygoogle = window.adsbygoogle || [];
          // Only push if the current ins element has not already been populated by AdSense
          if (adRef.current && !adRef.current.getAttribute('data-adsbygoogle-status')) {
            adsbygoogle.push({});
            setAdLoaded(true);
          }
        }
      } catch (err) {
        // Silently catch adblocker or duplicate push notices
        console.debug('AdSense notice:', err);
      }
    }, 100);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [slotType, postId]);

  if (slotType === 'top') {
    return (
      <div
        className={`ads-container-top w-full overflow-hidden my-4 py-2 text-center ${className}`}
        style={{ textAlign: 'center', margin: '15px 0' }}
      >


        {/* 1. إعلان أول المقال (تحت العنوان مباشرة أو أسفل صورة الغلاف) */}
        <div className="min-h-[100px] w-full flex items-center justify-center rounded-xl bg-gray-50/60 dark:bg-[#1a1e3b]/40 border border-dashed border-gray-200 dark:border-[#2f366b]/60 transition-colors">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', minWidth: '250px', width: '100%' }}
            data-ad-client="ca-pub-4007921870267373"
            data-ad-slot="6095642195"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    );
  }

  if (slotType === 'middle') {
    return (
      <div
        className={`ads-container-middle w-full overflow-hidden my-6 py-2 text-center ${className}`}
        style={{ textAlign: 'center', margin: '25px 0' }}
      >


        {/* 2. إعلان داخل المقالة (يُوضع بعد الفقرة الثانية أو الثالثة بين العناوين) */}
        <div className="min-h-[120px] w-full flex items-center justify-center rounded-xl bg-gray-50/60 dark:bg-[#1a1e3b]/40 border border-dashed border-gray-200 dark:border-[#2f366b]/60 transition-colors">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', textAlign: 'center', minWidth: '250px', width: '100%' }}
            data-ad-layout="in-article"
            data-ad-format="fluid"
            data-ad-client="ca-pub-4007921870267373"
            data-ad-slot="9436457809"
          />
        </div>
      </div>
    );
  }

  // 3. إعلان آخر المقال (يُوضع قبل قسم التعليقات مباشرة)
  return (
    <div
      className={`ads-container-bottom w-full overflow-hidden my-8 py-2 text-center ${className}`}
      style={{ textAlign: 'center', margin: '30px 0' }}
    >


      <div className="min-h-[120px] w-full flex items-center justify-center rounded-xl bg-gray-50/60 dark:bg-[#1a1e3b]/40 border border-dashed border-gray-200 dark:border-[#2f366b]/60 transition-colors">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', minWidth: '250px', width: '100%' }}
          data-ad-format="fluid"
          data-ad-layout-key="-4w+cn-4m-le+1cu"
          data-ad-client="ca-pub-4007921870267373"
          data-ad-slot="7782187757"
        />
      </div>
    </div>
  );
};
