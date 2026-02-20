# IMPORTANT: Read This Fully Before Starting

## What Is This?
I am working on the **V-Tech E-Commerce** project. This is a **multi-vendor marketplace** with THREE parts:

1. **Backend API** — Express.js + MongoDB + Cloudinary (`shop/apps/api/src/`)
2. **Web Frontend** — React + Vite + Tailwind (`shop/apps/web/src/`)
3. **Mobile App** — React Native + Expo (this is in a SEPARATE repo, you don't have access to it)

All three share the **same backend API**. The mobile app and web app both call the same Express.js backend.

---

## The Problem

Right now, the **mobile app** (and probably the web app too) has a LOT of content that is **hardcoded directly in the frontend code**. This means:

- **Banners** on the homepage — the titles, subtitles, and images are written directly in the React component code
- **Coupons** — coupon codes like "SAVE10", "FIRST50" are hardcoded in the frontend
- **Spin Wheel prizes** — the wheel segments, rewards, and colors are all static in the code
- **Quiz questions** — questions and answers are hardcoded
- **Contact info** — phone number, email, business hours are hardcoded strings
- **About page** — company name, stats like "1000+ Happy Customers" are hardcoded
- **Referral rewards** — the ₹100 reward amount is hardcoded
- **Festival sale** — sale end date and categories are hardcoded
- **Gift card amounts** — ₹250, ₹500, ₹1000 etc. are hardcoded

**The problem is:** If the admin wants to change a banner image, add a new coupon, change quiz questions, or update contact info — they CANNOT do it. A developer has to manually edit the code and redeploy. This is not acceptable for a production e-commerce app.

---

## What Needs To Be Done

We need to create **backend API endpoints** + **admin panel pages** so that the admin can manage ALL of this content from the web admin dashboard. When admin makes a change, both the web app AND the mobile app will automatically show the updated content (because they both fetch from the same API).

Think of it like Amazon or Flipkart — the marketing team can change homepage banners, create new coupon codes, set up festival sales — all from an admin panel. No code changes needed.

---

## PART 1: Backend API Endpoints to Create

### 1.1 BANNERS (`/api/banners`)

**Why:** The homepage has a sliding banner/carousel at the top. Right now it shows hardcoded text with gradient backgrounds. We need admin to be able to upload banner images (to Cloudinary) and set titles/subtitles/links.

**Create this Mongoose Model — `Banner`:**
```js
const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },           // e.g. "Welcome to V-Tech"
  subtitle: { type: String },                         // e.g. "Discover amazing products"
  image: { type: String, required: true },            // Cloudinary URL — admin uploads image
  link: { type: String, default: '' },                // Where to navigate when tapped, e.g. "/product/list?sort=-discount"
  isActive: { type: Boolean, default: true },         // Admin can turn banners on/off
  order: { type: Number, default: 0 },                // Controls display order (1 shows first, 2 second, etc.)
  startDate: { type: Date },                          // Optional: banner only shows after this date
  endDate: { type: Date },                            // Optional: banner stops showing after this date
}, { timestamps: true });
```

**Create these Routes:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/banners` | Public (no auth) | Returns all active banners. Filter: `isActive: true`, current date between startDate and endDate (if set). Sort by `order` field ascending. |
| POST | `/api/banners` | Admin only | Create a new banner. Accept image upload (use existing Cloudinary middleware to upload image and get URL). |
| PUT | `/api/banners/:id` | Admin only | Update a banner. If new image is uploaded, upload to Cloudinary and update URL. |
| DELETE | `/api/banners/:id` | Admin only | Delete a banner. Also delete image from Cloudinary if possible. |

**GET /api/banners response example:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "abc123",
      "title": "Diwali Mega Sale",
      "subtitle": "Up to 70% off",
      "image": "https://res.cloudinary.com/xxx/image/upload/v1/banners/diwali-sale.jpg",
      "link": "/pages/festival-sale",
      "order": 1,
      "isActive": true
    },
    {
      "_id": "def456",
      "title": "Free Shipping",
      "subtitle": "On orders above ₹999",
      "image": "https://res.cloudinary.com/xxx/image/upload/v1/banners/free-shipping.jpg",
      "link": "",
      "order": 2,
      "isActive": true
    }
  ]
}
```

---

### 1.2 COUPONS (`/api/coupons`)

**Why:** The app has a "Coupons" page that shows available discount codes. Right now coupon codes like SAVE10, FIRST50, BUNDLE20 are all hardcoded. Admin should be able to create, activate, deactivate, and expire coupons.

**IMPORTANT:** Check if a Coupon model/routes already exist in the codebase. If they do, update them to support all the fields below. If they don't exist, create them fresh.

**Model — `Coupon`:**
```js
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },  // "SAVE10"
  type: { type: String, enum: ['percentage', 'fixed'], required: true },  // percentage = 10% off, fixed = ₹50 off
  value: { type: Number, required: true },            // 10 means either 10% or ₹10
  description: { type: String, required: true },      // "Get 10% off on all products"
  terms: [{ type: String }],                          // ["Minimum order ₹499", "Max discount ₹200", "Valid on all products"]
  minOrderAmount: { type: Number, default: 0 },       // Minimum cart value to apply this coupon
  maxDiscount: { type: Number },                      // For percentage type — caps the discount amount
  category: { type: String, enum: ['general', 'first_order', 'shipping', 'festival', 'bundle'], default: 'general' },
  isActive: { type: Boolean, default: true },
  usageLimit: { type: Number, default: 0 },           // 0 = unlimited usage
  usedCount: { type: Number, default: 0 },            // Tracks how many times this coupon has been used
  perUserLimit: { type: Number, default: 1 },         // How many times ONE user can use this coupon
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });
```

**Routes:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/coupons` | Public | Returns all active, non-expired coupons (for showing in the coupons page). Filter: `isActive: true`, `endDate` not passed, `usedCount < usageLimit` (if usageLimit > 0). |
| GET | `/api/coupons/validate` | Auth required | Validate a coupon: `?code=SAVE10&cartTotal=599`. Check: is active, within date range, usage limits not exceeded, cart meets minimum amount. Return the discount amount. |
| POST | `/api/coupons` | Admin only | Create new coupon. |
| PUT | `/api/coupons/:id` | Admin only | Update coupon. |
| DELETE | `/api/coupons/:id` | Admin only | Delete coupon. |

---

### 1.3 SPIN WHEEL — Gamification (`/api/gamification/spin`)

**Why:** The app has a "Spin & Win" game where users spin a wheel to win discounts or loyalty points. Right now the 8 wheel segments (₹10, ₹25, ₹50, ₹100, "Better Luck", etc.) are hardcoded. Admin should be able to configure what prizes appear, their colors, and the probability of winning each prize.

**CRITICAL: The spin result MUST be calculated on the SERVER, not the client.** If we let the client decide what prize the user wins, users can cheat by modifying the app. The server picks the prize based on configured probabilities, then tells the client what they won.

**Model — `SpinConfig`** (single document — only ONE config exists, use upsert):
```js
const spinConfigSchema = new mongoose.Schema({
  segments: [{
    label: { type: String, required: true },      // "₹10 Off" or "Better Luck Next Time"
    value: { type: Number, default: 0 },          // Prize amount (0 for no-prize segments)
    color: { type: String, required: true },      // Hex color for the wheel segment, e.g. "#FF6B6B"
    type: { type: String, enum: ['discount', 'points', 'no_prize'], default: 'discount' },
    probability: { type: Number, required: true },// e.g. 0.25 = 25% chance. ALL probabilities must sum to 1.0
  }],
  dailySpinsAllowed: { type: Number, default: 1 },  // How many spins per user per day
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
```

**Model — `SpinHistory`** (tracks every spin):
```js
const spinHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prize: { type: String, required: true },        // The label of what they won
  value: { type: Number, default: 0 },            // Prize value
  type: { type: String },                         // discount/points/no_prize
  spunAt: { type: Date, default: Date.now },
});
```

**Routes:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/gamification/spin/config` | Auth required | Get wheel config (segments with labels, colors, etc.) + how many spins the user has remaining today. **DO NOT send probabilities to the client** — only send label, value, color, type. |
| POST | `/api/gamification/spin` | Auth required | Spin the wheel. Server picks winner based on probability. Check user hasn't exceeded daily limit. Save to SpinHistory. If prize is "discount", create a single-use coupon. If "points", add to user's loyalty points. Return: `{ segment: index, prize: "₹10 Off", value: 10, type: "discount" }`. The `segment` index tells the client which segment to land on for the animation. |
| GET | `/api/gamification/spin/history` | Auth required | User's past spin results. |
| PUT | `/api/gamification/spin/config` | Admin only | Update the wheel configuration (segments, daily limit, active status). Validate that all probabilities sum to 1.0. |

**How the spin flow works:**
1. Mobile app calls `GET /api/gamification/spin/config` → gets segments (without probabilities) + remaining spins
2. User taps "Spin" → app calls `POST /api/gamification/spin`
3. Server uses weighted random selection based on probabilities to pick a segment
4. Server returns `{ segment: 3, prize: "₹50 Off", value: 50, type: "discount" }`
5. App animates the wheel to land on segment index 3
6. If user won a discount, server auto-creates a single-use coupon code for them

---

### 1.4 QUIZ — Gamification (`/api/gamification/quiz`)

**Why:** The app has a "Daily Quiz" where users answer questions to earn loyalty points. Right now 5 questions are hardcoded (like "Which planet is the Red Planet?"). Admin should manage a pool of questions, and the app picks random ones each day.

**Model — `QuizQuestion`:**
```js
const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },         // "Which planet is known as the Red Planet?"
  options: [{ type: String, required: true }],        // ["Venus", "Mars", "Jupiter", "Saturn"] — array of 4 options
  correctAnswer: { type: Number, required: true },    // Index of correct option (0-based). e.g. 1 = "Mars"
  points: { type: Number, default: 10 },              // Loyalty points awarded for correct answer
  isActive: { type: Boolean, default: true },
  category: { type: String, enum: ['general', 'tech', 'shopping', 'science'], default: 'general' },
}, { timestamps: true });
```

**Model — `QuizAttempt`:**
```js
const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true },
  selectedAnswer: { type: Number, required: true },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, default: 0 },
  attemptedAt: { type: Date, default: Date.now },
});
```

**Routes:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/gamification/quiz/daily` | Auth required | Get today's quiz. Pick 5 random active questions that this user has NOT answered today. If user already answered all available questions today, return empty array. **DO NOT include `correctAnswer` in the response** — the client should not know the answer before submitting. |
| POST | `/api/gamification/quiz/answer` | Auth required | Submit answer: `{ questionId: "abc", selectedAnswer: 1 }`. Server checks if answer is correct, awards points if yes, saves attempt. Response: `{ isCorrect: true, correctAnswer: 1, pointsEarned: 10 }`. |
| GET | `/api/gamification/quiz/history` | Auth required | User's quiz history with stats (total attempts, correct count, total points). |
| POST | `/api/gamification/quiz/questions` | Admin only | Create a new quiz question. |
| PUT | `/api/gamification/quiz/questions/:id` | Admin only | Update a question. |
| DELETE | `/api/gamification/quiz/questions/:id` | Admin only | Delete a question. |
| GET | `/api/gamification/quiz/questions` | Admin only | List ALL questions (including inactive) for admin management. This one SHOULD include correctAnswer. |

---

### 1.5 APP CONFIG (`/api/config/app`)

**Why:** Various pages in the app show content that the admin should control — contact info, about page stats, referral reward amounts, festival sale settings, gift card denominations. Instead of creating separate API endpoints for each tiny thing, we use ONE config document that holds all of these settings.

**Model — `AppConfig`** (single document — use `findOne()` and upsert):
```js
const appConfigSchema = new mongoose.Schema({
  contactInfo: {
    email: { type: String, default: 'support@vtechkitchen.com' },
    phone: { type: String, default: '+91 98765 43210' },
    whatsapp: { type: String, default: '+91 98765 43210' },
    website: { type: String, default: 'vtechkitchen.com' },
    businessHours: { type: String, default: 'Monday - Saturday: 9:00 AM - 6:00 PM' },
    address: { type: String, default: '' },
  },
  aboutPage: {
    companyName: { type: String, default: 'V-Tech' },
    tagline: { type: String, default: 'Premium Products' },
    description: { type: String, default: '' },
    stats: [{
      label: String,    // "Happy Customers"
      value: String,    // "1000+"
      icon: String,     // "people" (Ionicons icon name)
    }],
  },
  referralConfig: {
    rewardAmount: { type: Number, default: 100 },     // ₹100 per referral
    referrerReward: { type: Number, default: 100 },   // Person who refers gets ₹100
    refereeReward: { type: Number, default: 50 },     // New user who signs up gets ₹50
    isActive: { type: Boolean, default: true },
  },
  festivalSale: {
    isActive: { type: Boolean, default: false },
    title: { type: String, default: 'Festival Sale' },
    endDate: { type: Date },
    categories: [{
      name: String,           // "Electronics"
      searchQuery: String,    // "electronics" — used to search products
      icon: String,           // "phone-portrait" (Ionicons icon name)
      gradient: [String],     // ["#4F46E5", "#7C3AED"] — two hex colors for gradient
    }],
  },
  giftCardAmounts: { type: [Number], default: [250, 500, 1000, 2000, 5000] },
}, { timestamps: true });
```

**Routes:**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/config/app` | Public (no auth) | Returns the app config. If no config document exists, create one with defaults and return it. |
| PUT | `/api/config/app` | Admin only | Update the config. Use `findOneAndUpdate` with `upsert: true`. Admin sends only the fields they want to change. |

---

## PART 2: Admin Panel Pages (Web Frontend)

Create these pages in the web app's admin section so the admin can manage everything:

### 2.1 Banners Management (`/admin/banners`)
- Table/grid showing all banners (image thumbnail, title, status, order)
- "Add Banner" button → form with: title, subtitle, image upload (Cloudinary), link, active toggle, start/end dates
- Edit/delete buttons on each banner
- Drag-to-reorder OR simple order number input
- Toggle switch to quickly activate/deactivate a banner

### 2.2 Coupons Management (`/admin/coupons`)
- Table showing all coupons: code, type, value, status, usage (usedCount/usageLimit), dates
- "Create Coupon" button → form with all fields
- Edit/delete buttons
- Status badge: Active (green), Expired (red), Scheduled (yellow)

### 2.3 Gamification Management (`/admin/gamification`)
Two tabs:

**Spin Wheel tab:**
- Visual preview of the wheel with current segments
- Form to edit segments: label, value, color (color picker), type, probability
- Add/remove segment buttons
- Warning if probabilities don't sum to 1.0
- Daily spin limit setting
- Active/inactive toggle

**Quiz tab:**
- Table of all questions with: question text, category, points, status
- "Add Question" button → form: question, 4 options, mark correct answer, points, category
- Edit/delete buttons
- Stats: total questions, total attempts today, average score

### 2.4 App Config (`/admin/app-config`)
Sections with forms:
- **Contact Info**: email, phone, whatsapp, website, business hours, address
- **About Page**: company name, tagline, description, stats (add/remove rows)
- **Referral Program**: reward amounts, active toggle
- **Festival Sale**: active toggle, title, end date, categories (add/remove)
- **Gift Cards**: editable list of amounts
- Single "Save" button that updates the entire config

---

## PART 3: Important Implementation Notes

1. **Use existing patterns.** Look at how other models, controllers, and routes are structured in the codebase (e.g., Product, Order, User) and follow the same patterns for file structure, error handling, response format, etc.

2. **Use existing middleware.** The project already has auth middleware (`isAdmin`, `isAuthenticated`, etc.) and Cloudinary upload middleware. Use those — don't create new ones.

3. **Response format.** Follow the existing response format used throughout the API. Typically: `{ success: true, data: ... }` for success and `{ success: false, error: { message: "..." } }` for errors.

4. **Both apps consume the same API.** The web app (React) and mobile app (React Native) both call these endpoints. The mobile app's base URL is `https://vtech-ecommerce.onrender.com/api`. Don't do anything web-specific in the API responses.

5. **Security:**
   - Spin wheel results MUST be server-side (don't let client pick the prize)
   - Quiz correct answers must NOT be sent to client before they submit
   - Coupon validation must happen server-side
   - All admin routes must check `isAdmin` middleware

6. **Seeding:** After creating the models, add some seed/default data so the APIs return something useful immediately:
   - 3-4 sample banners
   - 5 sample coupons (SAVE10, FIRST50, BUNDLE20, FREESHIP, FESTIVE15)
   - Spin wheel config with 8 segments
   - 10 sample quiz questions
   - Default app config

7. **File structure to follow:**
   - Model: `shop/apps/api/src/models/Banner.js` (or wherever models are)
   - Controller: `shop/apps/api/src/controllers/bannerController.js`
   - Routes: `shop/apps/api/src/routes/bannerRoutes.js`
   - Register routes in the main router file
   - Same pattern for each feature

8. **After creating the backend APIs**, also update the web frontend to:
   - Fetch banners from API instead of hardcoded data (if hardcoded in web too)
   - Fetch coupons from API for the coupons page
   - Use the admin panel pages to manage everything
