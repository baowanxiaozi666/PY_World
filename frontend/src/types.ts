
export interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
  parentId?: number | null;
  replies?: Comment[];
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  updateTime?: string;
  category: string;
  imageUrl: string;
  tags: string[];
  likes: number;
  views?: number;
  comments: Comment[];
}

export interface AboutProfile {
    displayName: string;
    avatarUrl: string;
    backgroundUrl?: string; // Optional custom video URL
    content: string;
    interests: string; // Comma separated string from backend
    animeTaste: string; // Comma separated string from backend
}

export interface MusicTrack {
    id?: number;
    title: string;
    artist: string;
    url: string;
    coverUrl: string;
}

export interface VersionLog {
    id?: number;
    version: string;
    content: string;
    releaseDate: string;
}

export enum Page {
  HOME = 'HOME',
  BLOG_DETAIL = 'BLOG_DETAIL',
  ABOUT = 'ABOUT',
  CHANGELOG = 'CHANGELOG',
  LOGIN = 'LOGIN',
  CREATE_POST = 'CREATE_POST',
  EDIT_POST = 'EDIT_POST',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  EDIT_PROFILE = 'EDIT_PROFILE',
  ADMIN_MUSIC = 'ADMIN_MUSIC',
  ADMIN_VERSIONS = 'ADMIN_VERSIONS',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface NavItem {
  label: string;
  page: Page;
  icon?: string;
}

export interface CloudKeyword {
  id: number;
  text: string;
  count: number;
  // Visual properties generated on frontend
  size?: number;
  top?: string;
  animation?: string;
  delay?: string;
  opacity?: number;
  rotate?: string;
}

export type Theme = 'sakura' | 'cyber';