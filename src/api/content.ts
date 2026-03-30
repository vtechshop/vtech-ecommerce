import apiClient from './client';
import { ApiResponse } from '../types';

// --- Banner Types ---
export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  isActive: boolean;
  order: number;
}

// --- Coupon Types ---
export interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  terms: string[];
  minOrderAmount: number;
  maxDiscount?: number;
  category: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

// --- App Config Types ---
export interface AppConfig {
  _id: string;
  contactInfo: {
    email: string;
    phone: string;
    whatsapp: string;
    website: string;
    businessHours: string;
    address: string;
  };
  aboutPage: {
    companyName: string;
    tagline: string;
    description: string;
    stats: { label: string; value: string; icon: string }[];
  };
  referralConfig: {
    rewardAmount: number;
    referrerReward: number;
    refereeReward: number;
    isActive: boolean;
  };
  festivalSale: {
    isActive: boolean;
    title: string;
    endDate?: string;
    categories: {
      name: string;
      searchQuery: string;
      icon: string;
      gradient: string[];
    }[];
  };
  giftCardAmounts: number[];
}

// --- Spin Wheel Types ---
export interface SpinSegment {
  label: string;
  value: number;
  color: string;
  type: 'discount' | 'points' | 'no_prize';
}

export interface SpinConfig {
  segments: SpinSegment[];
  dailySpinsAllowed: number;
  remainingSpins: number;
  isActive: boolean;
}

export interface SpinResult {
  segment: number;
  prize: string;
  value: number;
  type: string;
}

// --- Quiz Types ---
export interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
  points: number;
  category: string;
}

export interface QuizAnswerResult {
  isCorrect: boolean;
  correctAnswer: number;
  pointsEarned: number;
}

// --- API Functions ---

export const bannersApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Banner[]>>('/banners'),
};

export const couponsApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Coupon[]>>('/coupons'),

  validate: (code: string, cartTotal: number) =>
    apiClient.get<ApiResponse<{ discount: number; coupon: Coupon }>>('/coupons/validate', {
      params: { code, cartTotal },
    }),
};

export const appConfigApi = {
  get: () =>
    apiClient.get<ApiResponse<AppConfig>>('/config/app'),
};

export const spinApi = {
  getConfig: () =>
    apiClient.get<ApiResponse<SpinConfig>>('/gamification/spin/config'),

  spin: () =>
    apiClient.post<ApiResponse<SpinResult>>('/gamification/spin'),

  getHistory: () =>
    apiClient.get<ApiResponse<any[]>>('/gamification/spin/history'),
};

export const quizApi = {
  getDaily: () =>
    apiClient.get<ApiResponse<QuizQuestion[]>>('/gamification/quiz/daily'),

  submitAnswer: (questionId: string, selectedAnswer: number) =>
    apiClient.post<ApiResponse<QuizAnswerResult>>('/gamification/quiz/answer', {
      questionId,
      selectedAnswer,
    }),

  getHistory: () =>
    apiClient.get<ApiResponse<any>>('/gamification/quiz/history'),
};
