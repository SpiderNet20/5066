export interface Comment {
  id: string;
  author: string;
  avatar: string;
  date: string;
  content: string;
  replies?: Comment[];
}

export type CategorySlugType = 'AI' | 'Games' | 'Software' | 'Downloads' | 'Business' | 'Blog' | 'Education' | string;

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  categorySlug: CategorySlugType;
  categoryIndex: number;
  canonicalUrl?: string;
  date: string;
  isoDate: string;
  readTime: string;
  author: {
    name: string;
    avatar: string;
    role: string;
    bio: string;
  };
  thumbnail: string;
  imageAlt?: string;
  snippet: string;
  content: {
    intro: string;
    sections: {
      id: string;
      title: string;
      body: string[];
      note?: {
        type: 'info' | 'warn' | 'success';
        text: string;
      };
      code?: string;
      downloadUrl?: string;
    }[];
  };
  tags: string[];
  commentsCount: number;
  comments: Comment[];
  rawContent?: string;
  link?: string;
  modifiedIso?: string;
  ogImage?: string;
  keywords?: string[];
  // CMS Fields
  status?: 'published' | 'draft';
  seoTitle?: string;
  seoDescription?: string;
  noindex?: boolean;
  updatedAt?: string;
  viewsCount?: number;
}

export interface CategoryInfo {
  name: string;
  slug: string;
  count: number;
  colorClass: string;
  description: string;
  image: string;
}

export type StandalonePageType = 'about' | 'contact' | 'privacy' | 'terms' | 'sitemap';

export interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalCategories: number;
  totalViews: number;
}

export interface AdminAuthResponse {
  success: boolean;
  token?: string;
  username?: string;
  error?: string;
}
