<!-- FILE: README.md -->
# Shop - Multi-Vendor E-Commerce Platform

A production-ready multi-vendor e-commerce platform with sponsored ads, affiliate marketing, order tracking, and comprehensive vendor management.

## Features

### Core E-Commerce
- Multi-vendor marketplace with vendor onboarding and KYC
- Product catalog with categories, variants, and inventory management
- Shopping cart with guest and logged-in user support
- Secure checkout with multiple payment methods (Stripe, Razorpay)
- Order management with real-time tracking
- Returns and refunds system

### Sponsored Ads System
- Campaign management (CPC/CPM pricing)
- Ad auction system with quality score
- Multiple placements (search, category, product pages)
- Real-time analytics and reporting
- Ad wallet with balance management
- Fraud prevention (click deduplication, frequency caps)

### Affiliate Program
- Affiliate signup and approval workflow
- Unique tracking links with cookie-based attribution
- Commission calculation and payout management
- Performance analytics dashboard

### Order Tracking
- Real-time shipment tracking
- Carrier integration (webhook support)
- Timeline view with status updates
- Public tracking page (order ID + email)
- Email/SMS notifications

### SEO & Content
- Server-side rendering for key pages
- JSON-LD structured data
- Automated sitemaps (products, categories, blog, vendors)
- robots.txt generation
- Blog and CMS pages

### Cookie Consent & Privacy
- GDPR-compliant cookie banner
- Granular consent management (essential/analytics/marketing)
- Consent-aware analytics loading (GA4, Meta Pixel)
- Cookie policy page

### User Roles & Dashboards
- **Customer**: Orders, addresses, wishlist, returns
- **Vendor**: Products, inventory, orders, settlements, ads
- **Affiliate**: Links, commissions, payouts
- **Support**: Tickets, order search
- **Admin**: Full platform management

## Tech Stack

### Frontend
- React 18 with Vite
- Redux Toolkit for state management
- React Query for server state
- React Router for routing
- Tailwind CSS for styling
- Recharts for analytics

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication with refresh tokens
- Helmet for security
- Pino for logging
- Nodemailer for emails

### Infrastructure
- Docker + Docker Compose
- Nginx reverse proxy
- Local/S3 file storage
- Rate limiting and CORS

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Docker & Docker Compose (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shop