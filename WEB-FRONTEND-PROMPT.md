# Task: Connect Web Frontend to Dynamic Content APIs

## What Happened
We built 4 new backend API modules with an admin panel so the admin can manage all content dynamically:
- **Banners** — homepage carousel/hero images
- **Coupons** — discount codes with terms, categories, validation
- **Gamification** — spin wheel (segments + server-side result), daily quiz (questions + server-side answer check)
- **App Config** — contact info, about page, referral rewards, festival sale settings, gift card amounts

The backend APIs and admin panel are already LIVE and working. **No backend changes needed.**

## Your Task
Update the **customer-facing web frontend pages** to fetch content from these APIs instead of hardcoded data.

### IMPORTANT — DO NOT ASSUME WHICH PAGES EXIST
The web app and mobile app are separate projects with **different pages and structure**. You MUST:
1. **First scan the web frontend codebase** — find all pages/components that have hardcoded content
2. **Match them to the APIs below** — only update pages that actually exist in the web app
3. **Skip any API that has no matching page** — if the web app doesn't have a spin wheel page, don't create one
4. **Don't create new pages** — only update existing ones to use dynamic data

---

## API Reference

All endpoints return: `{ success: boolean, data: T, message?: string }`
Access data via: `response.data.data`

### 1. Banners
```
GET /api/banners
```
```typescript
interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;          // Cloudinary URL
  link?: string;          // Optional click-through URL
  isActive: boolean;
  order: number;
}
```
**Use for**: Any homepage hero/carousel/banner section that shows promotional images.

### 2. Coupons
```
GET /api/coupons
GET /api/coupons/validate?code=XXX&cartTotal=1000
```
```typescript
interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  terms: string[];
  minOrderAmount: number;
  maxDiscount?: number;
  category: string;       // 'general' | 'first_order' | 'shipping' | 'festival' | 'bundle'
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}
```
**Use for**: Any coupons/offers page AND checkout coupon input field.

### 3. App Config (single endpoint, multiple sections)
```
GET /api/config/app
```
```typescript
interface AppConfig {
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
```
**Use for**: This is a bag of config. Match each sub-field to whatever page uses that data:
- `contactInfo` → contact/support page (if exists)
- `aboutPage` → about us page (if exists)
- `referralConfig` → referral/invite page (if exists)
- `festivalSale` → any sale/deals page (if exists)
- `giftCardAmounts` → gift cards page (if exists)

### 4. Spin Wheel
```
GET  /api/gamification/spin/config    → SpinConfig (public)
POST /api/gamification/spin           → SpinResult (auth required)
GET  /api/gamification/spin/history   → SpinHistory[] (auth required)
```
```typescript
interface SpinConfig {
  segments: { label: string; value: number; color: string; type: 'discount' | 'points' | 'no_prize' }[];
  dailySpinsAllowed: number;
  remainingSpins: number;
  isActive: boolean;
}
interface SpinResult {
  segment: number;      // Index of the winning segment
  prize: string;
  value: number;
  type: string;
}
```
**Use for**: Spin wheel / lucky wheel page (if exists). Result MUST come from server `POST /spin`, not client-side random.

### 5. Quiz
```
GET  /api/gamification/quiz/daily       → QuizQuestion[] (public)
POST /api/gamification/quiz/answer      → QuizAnswerResult (auth required)
     Body: { questionId: string, selectedAnswer: number }
GET  /api/gamification/quiz/history     → QuizHistory (auth required)
```
```typescript
interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];        // correctAnswer is NOT included
  points: number;
  category: string;
}
interface QuizAnswerResult {
  isCorrect: boolean;
  correctAnswer: number;    // Revealed only AFTER answering
  pointsEarned: number;
}
```
**Use for**: Quiz page (if exists). Correct answer MUST NOT be known client-side before the user answers.

---

## How to Update Each Page You Find

### Pattern (same for all pages):
```typescript
// 1. Keep existing hardcoded data as FALLBACK
const FALLBACK_DATA = [ /* existing hardcoded stuff */ ];

// 2. Use state, initialized with fallback
const [data, setData] = useState(FALLBACK_DATA);

// 3. Fetch on mount, update if API returns data
useEffect(() => {
  someApi.get()
    .then((res) => {
      if (res.data.data && /* has content */) {
        setData(res.data.data);
      }
    })
    .catch(() => {}); // silently keep fallback
}, []);
```

### Rules:
- **Never break the page** if API fails — fallback data keeps it working
- **Don't add loading spinners** for small config data (contact, about) — just swap silently
- **Do add loading indicators** for lists that take time (coupons list, quiz questions)
- **Auth-required endpoints** (spin POST, quiz POST) — handle 401 gracefully (show login prompt or fallback)

---

## API Service File

Create one service file for all these endpoints. Adapt the import to match your existing axios/fetch setup:

```typescript
import api from './your-existing-axios-instance';

export const bannersApi = {
  getAll: () => api.get('/banners'),
};

export const couponsApi = {
  getAll: () => api.get('/coupons'),
  validate: (code: string, cartTotal: number) =>
    api.get('/coupons/validate', { params: { code, cartTotal } }),
};

export const appConfigApi = {
  get: () => api.get('/config/app'),
};

export const spinApi = {
  getConfig: () => api.get('/gamification/spin/config'),
  spin: () => api.post('/gamification/spin'),
  getHistory: () => api.get('/gamification/spin/history'),
};

export const quizApi = {
  getDaily: () => api.get('/gamification/quiz/daily'),
  submitAnswer: (questionId: string, selectedAnswer: number) =>
    api.post('/gamification/quiz/answer', { questionId, selectedAnswer }),
  getHistory: () => api.get('/gamification/quiz/history'),
};
```

## Steps Summary
1. **Scan the web app** — find all pages with hardcoded content (banners, coupons, contact info, about text, reward amounts, sale config, quiz questions, spin segments, gift card amounts, etc.)
2. **Create the API service file** above
3. **For each page found** — apply the fallback + fetch pattern
4. **Skip APIs that have no matching page** in the web app
5. **Test** — make sure pages still work when API is down (fallback shows)
