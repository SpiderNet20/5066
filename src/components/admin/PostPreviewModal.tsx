import React from 'react';
import { X, Send, Save, ArrowRight } from 'lucide-react';
import { Post, CategoryInfo } from '../../types';
import { PostPageView } from '../PostPageView';

interface PostPreviewModalProps {
  post: Post;
  allPosts: Post[];
  categories: CategoryInfo[];
  onClose: () => void;
  onPublishNow?: () => void;
}

export const PostPreviewModal: React.FC<PostPreviewModalProps> = ({
  post,
  allPosts,
  categories,
  onClose,
  onPublishNow,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex flex-col font-['Tajawal',sans-serif]" dir="rtl">
      {/* Top Bar Alert */}
      <div className="sticky top-0 z-50 bg-[#0c1022]/95 border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            وضع المعاينة قبل النشر
          </span>
          <span className="text-xs text-gray-300 hidden sm:inline">
            هكذا سيظهر المقال تماماً لزوار موقع العنكبوت للمعلومات ومحركات البحث
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onPublishNow && (
            <button
              onClick={() => {
                onPublishNow();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#035dcd] hover:bg-[#0249a3] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>نشر المقال الآن</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-200 text-xs rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق المعاينة</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container using actual PostPageView */}
      <div className="flex-1 bg-[#f7f7f7] dark:bg-[#1b1e38]">
        <PostPageView
          post={post}
          allPosts={allPosts}
          categories={categories}
          activeCategory={post.categorySlug}
          onSelectCategory={() => {}}
          onSelectPost={() => {}}
          onBackToHome={onClose}
          onOpenSeoViewer={() => {}}
          onOpenImage={() => {}}
          onOpenSpeedTest={() => {}}
          onOpenRedirectTool={() => {}}
          onSearchQuery={() => {}}
        />
      </div>
    </div>
  );
};
