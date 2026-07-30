import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Phone, Mail, MapPin, MessageCircle, Package, Shield,
  FileText, ArrowRight, Clock, BookOpen, Headphones, Building2,
  TrendingUp, ChevronRight, Star, Users, Tag, Award,
  Zap, Truck, ShieldCheck, ArrowUp, Youtube, Factory,
} from 'lucide-react';
import SEO from '@/components/common/SEO';
import CountUp from '@/components/animations/CountUp';
import api from '@/store/api';

/* ── Contact constants ── */
const PHONE_HREF     = 'tel:+919944556683';
const PHONE_DISPLAY  = '+91 99445 56683';
const WA_HREF        = 'https://wa.me/919944556683?text=Hi%2C%20I%27m%20interested%20in%20VTech%20Kitchen%20products';
const EMAIL_HREF     = 'mailto:vtechshop.customercare@gmail.com';
const YOUTUBE_HREF   = 'https://www.youtube.com/@makethingsbest';
const MAPS_HREF      = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';
const MAPS_EMBED     = 'https://maps.google.com/maps?q=Ganapathy+Coimbatore+Tamil+Nadu&t=&z=15&ie=UTF8&iwloc=&output=embed';
const INSTAGRAM_HREF = 'https://instagram.com';
const FACEBOOK_HREF  = 'https://facebook.com';
const LINKEDIN_HREF  = 'https://linkedin.com';

/* Computed once at module init — not on every render */
const CURRENT_YEAR = new Date().getFullYear();

/* ── Structured data ── */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VTech Kitchen',
  url: 'https://www.vtechkitchen.com',
  logo: 'https://www.vtechkitchen.com/cropped-vtech-logo.webp',
  description: 'Commercial Kitchen Equipment Manufacturer. Professional machines for restaurants, hotels, and food businesses across India.',
  contactPoint: [{ '@type': 'ContactPoint', telephone: '+91-99445-56683', contactType: 'customer service', availableLanguage: ['English', 'Tamil'] }],
  address: { '@type': 'PostalAddress', addressLocality: 'Ganapathy', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
  sameAs: [YOUTUBE_HREF, INSTAGRAM_HREF, FACEBOOK_HREF, LINKEDIN_HREF],
};

/* ══════════════════════════════════════════════
   UTILITY COMPONENTS
══════════════════════════════════════════════ */

/* FadeIn — respects prefers-reduced-motion */
const FadeIn = ({ children, delay = 0, className = '', y = 20 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: reduced ? 0.01 : 0.6,
        delay: reduced ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* Section — semantic landmark with accessible region label */
const Section = ({ children, className = '', id, ariaLabel }) => (
  <section id={id} aria-label={ariaLabel} className={`py-16 md:py-20 ${className}`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

/*
  SectionTitle — matches existing VTech Kitchen heading scale (text-xl md:text-2xl).
  Eyebrow as plain-text label above the heading — no pill border/bg (not in existing site).
*/
const SectionTitle = ({ eyebrow, title, subtitle, light = false }) => (
  <FadeIn className="text-center mb-10 md:mb-12">
    {eyebrow && (
      <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-3 ${light ? 'text-blue-200' : 'text-primary-600 dark:text-primary-400'}`}>
        {eyebrow}
      </p>
    )}
    <h2 className={`text-xl md:text-2xl font-bold ${light ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`mt-3 text-sm max-w-xl mx-auto leading-relaxed ${light ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
        {subtitle}
      </p>
    )}
  </FadeIn>
);

/* Focus ring — matches site's focus-ring-primary-300 pattern */
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2';

/* Returns the correct tag (Link or <a>) based on href shape */
const linkable = (href) => {
  if (href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')) {
    return {
      tag: 'a',
      props: {
        href,
        target: href.startsWith('http') ? '_blank' : undefined,
        rel: href.startsWith('http') ? 'noopener noreferrer' : undefined,
      },
    };
  }
  return { tag: Link, props: { to: href } };
};

/*
  ProductSkeleton — matches site's animate-pulse skeleton pattern:
  bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse
*/
const ProductSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse motion-reduce:animate-none h-full">
    <div className="aspect-square bg-gray-100 dark:bg-gray-700" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded" />
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3" />
      <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-1/3 mt-4" />
    </div>
  </div>
);

/*
  ProductCard — mirrors site's .product-card CSS class:
  bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-2xl hover:-translate-y-2 hover:border-primary-300
*/
const ProductCard = ({ product, index }) => {
  const imgSrc = product.images?.[0]?.url || product.images?.[0] || product.image || null;
  return (
    <FadeIn delay={index * 0.07}>
      <Link
        to={`/product/${product.slug}`}
        aria-label={`View ${product.title}`}
        className={`product-card flex flex-col h-full group ${FOCUS_RING}`}
      >
        <div className="relative aspect-square bg-gray-50 dark:bg-gray-700 overflow-hidden">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.title}
              width={400}
              height={400}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-14 h-14 text-gray-200 dark:text-gray-600" aria-hidden="true" />
            </div>
          )}
          {product.featured && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
              Featured
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
            {product.title}
          </h3>
          {product.price > 0 && (
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </p>
          )}
          <div className="mt-auto pt-3 flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-2.5 transition-[gap] duration-300">
            View Product <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </Link>
    </FadeIn>
  );
};

/* ══════════════════════════════════════════════
   DATA — module-level, never re-created on render
══════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  { label: 'Shop Products',  desc: 'Browse all machines',      icon: ShoppingBag,   href: '/products',       color: 'bg-gradient-to-r from-primary-600 to-primary-700' },
  { label: 'WhatsApp',       desc: 'Chat instantly',           icon: MessageCircle, href: WA_HREF,           color: 'bg-green-500', ping: true },
  { label: 'Call Now',       desc: PHONE_DISPLAY,              icon: Phone,         href: PHONE_HREF,        color: 'bg-gradient-to-r from-primary-500 to-primary-600' },
  { label: 'Find Our Store', desc: 'Ganapathy, Coimbatore',    icon: MapPin,        href: MAPS_HREF,         color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
  { label: 'Email Us',       desc: 'Quick replies guaranteed', icon: Mail,          href: EMAIL_HREF,        color: 'bg-gradient-to-r from-primary-600 to-primary-700' },
  { label: 'Track Order',    desc: 'Real-time updates',        icon: Package,       href: '/track-order',    color: 'bg-gradient-to-r from-orange-500 to-orange-600' },
  { label: 'Warranty',       desc: 'Check your coverage',      icon: Shield,        href: '/warranty-check', color: 'bg-gradient-to-r from-amber-500 to-amber-600' },
];

const FEATURES = [
  { icon: Factory,     title: 'Direct Manufacturer', desc: 'Own factory, zero intermediaries — pure cost advantage for you.' },
  { icon: Tag,         title: 'Factory Pricing',      desc: 'Industry-best rates because we own the entire supply chain.' },
  { icon: Award,       title: 'Premium Quality',      desc: 'Industrial-grade components built for heavy commercial daily use.' },
  { icon: Zap,         title: 'Fast Dispatch',        desc: 'Quick order processing with reliable logistics partners.' },
  { icon: Truck,       title: 'All India Shipping',   desc: 'From Kanyakumari to Kashmir — we deliver to your doorstep.' },
  { icon: ShieldCheck, title: 'One Year Warranty',    desc: 'Full coverage warranty on every machine we manufacture.' },
  { icon: Headphones,  title: 'Dedicated Support',    desc: 'Expert team to help with setup, service, and spare parts.' },
  { icon: Star,        title: '5-Star Rated',         desc: 'Consistently loved and recommended by 10,000+ happy businesses.' },
];

const STATS = [
  { end: 10000, suffix: '+',  label: 'Happy Customers' },
  { end: 500,   suffix: '+',  label: 'Machine Models'  },
  { end: 7,     suffix: '+',  label: 'Years of Trust'  },
  { end: 28,    suffix: '',   label: 'States Served'   },
  { end: 4.9,   suffix: '/5', decimals: 1, label: 'Customer Rating', prefix: '★ ' },
];

const RESOURCES = [
  { icon: Youtube,    label: 'Watch on YouTube', desc: 'Product demos & machine videos', href: YOUTUBE_HREF,   iconClass: 'bg-red-600'      },
  { icon: BookOpen,   label: 'Read Our Blog',    desc: 'Tips, guides & industry news',   href: '/blog',         iconClass: 'bg-gradient-to-br from-primary-600 to-primary-700' },
  { icon: FileText,   label: 'User Manuals',     desc: 'Setup & usage documentation',    href: '/page/contact', iconClass: 'bg-gray-600'     },
  { icon: Headphones, label: 'Customer Support', desc: 'We respond within hours',        href: '/page/contact', iconClass: 'bg-gradient-to-br from-primary-500 to-primary-600' },
];

const SERVICES = [
  { icon: Building2,  label: 'Become a Dealer',  desc: 'Join our network across India',  href: '/page/contact' },
  { icon: FileText,   label: 'Request a Quote',   desc: 'Pricing tailored to your needs', href: '/page/contact' },
  { icon: Star,       label: 'Book a Demo',       desc: 'See machines working live',      href: WA_HREF         },
  { icon: TrendingUp, label: 'Bulk Purchase',     desc: 'Special rates for large orders', href: WA_HREF         },
  { icon: Users,      label: 'Contact Sales',     desc: 'Talk directly to our team',      href: PHONE_HREF      },
];

const SOCIALS = [
  {
    label: 'YouTube', handle: '@makethingsbest', href: YOUTUBE_HREF, hoverBg: 'group-hover:bg-red-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  {
    label: 'Instagram', handle: '@vtechkitchen', href: INSTAGRAM_HREF, hoverBg: 'group-hover:bg-pink-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    label: 'Facebook', handle: 'VTech Kitchen', href: FACEBOOK_HREF, hoverBg: 'group-hover:bg-blue-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    label: 'LinkedIn', handle: 'VTech Kitchen', href: LINKEDIN_HREF, hoverBg: 'group-hover:bg-blue-700',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
];

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const Hub = () => {
  const [showTop, setShowTop] = useState(false);
  const rafRef      = useRef(null);
  const progressRef = useRef(null);
  /* Hoist for hero animations */
  const reduced = useReducedMotion();

  /* RAF-throttled — progress bar via direct DOM ref (zero re-renders on scroll) */
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (progressRef.current) {
          const total = document.documentElement.scrollHeight - window.innerHeight;
          progressRef.current.style.width = total > 0 ? `${(scrollY / total) * 100}%` : '0%';
        }
        setShowTop(prev => {
          const next = scrollY > 500;
          return prev === next ? prev : next;
        });
        rafRef.current = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['hub-featured-products'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/products?featured=true&limit=6');
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasProducts = !productsLoading && products && products.length > 0;

  return (
    <>
      <SEO
        title="Quick Hub — VTech Kitchen | Commercial Kitchen Equipment"
        description="Shop commercial kitchen machines, get a quote, book a demo, or contact VTech Kitchen — everything in one place. Trusted by 10,000+ businesses across India."
        url="https://www.vtechkitchen.com/hub"
        keywords="VTech Kitchen, commercial kitchen equipment, vegetable cutting machine, chapati press, wet grinder, Coimbatore"
        structuredData={STRUCTURED_DATA}
      />

      {/* Scroll progress bar — width via DOM ref, zero re-renders */}
      <div
        ref={progressRef}
        aria-hidden="true"
        className="fixed top-0 left-0 z-50 h-[3px] bg-gradient-to-r from-primary-600 to-primary-300 motion-reduce:hidden"
        style={{ width: '0%' }}
      />

      {/* ══════════════════════════════
          HERO
          Matches Home.jsx: bg-gradient-to-r from-primary-600 to-primary-200
          White text on blue gradient — same as site hero pattern
      ══════════════════════════════ */}
      <section
        aria-label="VTech Kitchen Quick Hub"
        className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-200"
      >
        {/* Subtle concentric rings — white on blue, matching site's hero decorative pattern */}
        <div aria-hidden="true" className="absolute right-[-15%] md:right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          {[700, 520, 360, 220].map((size, i) => (
            <div
              key={size}
              className="absolute rounded-full border border-white"
              style={{
                width: size, height: size,
                opacity: 0.08 - i * 0.015,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        {/* Dot grid — white dots, consistent with existing gradient sections */}
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">

          {/* Logo — inverted white on blue hero background; LCP target */}
          <motion.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0.01 : 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/cropped-vtech-logo.webp"
              alt="VTech Kitchen logo"
              width={200}
              height={64}
              className="h-14 w-auto mx-auto mb-8 object-contain brightness-0 invert"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.15, duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs font-bold tracking-[0.25em] uppercase text-blue-100 mb-5"
          >
            Commercial Kitchen Equipment Manufacturer
          </motion.p>

          {/* H1 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            {['Professional', 'Kitchen', 'Machines'].map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: reduced ? 0 : 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.25 + i * 0.1, duration: reduced ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.58, duration: reduced ? 0.01 : 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-blue-100 mt-1"
            >
              Built to Grow Your Business.
            </motion.span>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.72, duration: reduced ? 0.01 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-base text-blue-100 max-w-xl mx-auto leading-relaxed"
          >
            Trusted by 10,000+ restaurants, hotels &amp; cloud kitchens across India.
          </motion.p>

          {/*
            CTAs — matches Home.jsx hero button patterns.
            Primary: white bg (on blue hero) — existing site pattern for hero CTAs.
            Secondary: green for WhatsApp (user requirement).
          */}
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.85, duration: reduced ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            {/* Primary CTA — red gradient matching site's discount badge/urgent action style */}
            <Link
              to="/products"
              className={`btn inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 px-6 py-3 rounded-lg font-semibold shadow-lg motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              Shop Products
            </Link>
            {/* WhatsApp — green only (user requirement) */}
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with VTech Kitchen on WhatsApp"
              className={`btn inline-flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600 px-6 py-3 rounded-lg font-semibold shadow-lg motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
            >
              <MessageCircle className="w-5 h-5" aria-hidden="true" />
              WhatsApp Us
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════
          QUICK ACTIONS
          bg-gray-50 — matches Home.jsx page background for secondary sections
      ══════════════════════════════ */}
      <Section id="quick-actions" ariaLabel="Quick actions" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Quick Actions"
          title="Everything In One Place"
          subtitle="Shop, call, chat, or navigate to our store — instantly."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((item, i) => {
            const { tag: Tag, props } = linkable(item.href);
            return (
              <FadeIn key={item.label} delay={i * 0.05} className="h-full">
                <Tag
                  {...props}
                  aria-label={item.label}
                  className={`card-lift relative flex flex-col gap-3 p-5 h-full group cursor-pointer ${FOCUS_RING}`}
                >
                  {/* WhatsApp live ping */}
                  {item.ping && (
                    <span className="absolute top-3 right-3 flex h-2.5 w-2.5" aria-hidden="true">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                  )}
                  <div className={`w-11 h-11 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-300`}>
                    <item.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 mt-auto transition-[color,transform] duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                </Tag>
              </FadeIn>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════
          FEATURED PRODUCTS
          bg-white — same as Category.jsx, consistent with site
      ══════════════════════════════ */}
      <Section id="products" ariaLabel="Featured products" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Our Products"
          title="Featured Machines"
          subtitle="Industrial-grade kitchen equipment for restaurants, hotels, cloud kitchens &amp; food factories."
        />

        {productsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4" aria-label="Loading products" aria-busy="true">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        )}

        {hasProducts && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p, i) => <ProductCard key={p._id || p.slug} product={p} index={i} />)}
          </div>
        )}

        {/* Fallback category links if no products returned */}
        {!productsLoading && !hasProducts && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🥬', label: 'Vegetable Cutting', href: '/search?q=vegetable+cutting+machine' },
              { icon: '🫓', label: 'Chapati Press',      href: '/search?q=chapati+press' },
              { icon: '🌀', label: 'Wet Grinders',       href: '/search?q=wet+grinder' },
              { icon: '🥥', label: 'Coconut Scrapers',   href: '/search?q=coconut+scraper' },
              { icon: '🥔', label: 'Potato Slicers',     href: '/search?q=potato+slicer' },
              { icon: '🥣', label: 'Dough Kneaders',     href: '/search?q=dough+kneader' },
            ].map((cat, i) => (
              <FadeIn key={cat.label} delay={i * 0.06}>
                <Link to={cat.href} className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 motion-reduce:hover:translate-y-0 group ${FOCUS_RING}`}>
                  <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{cat.icon}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-200 group-hover:text-primary-600 transition-colors">{cat.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0 group-hover:text-primary-500 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-[color,transform] duration-300" aria-hidden="true" />
                </Link>
              </FadeIn>
            ))}
          </div>
        )}

        <FadeIn delay={0.3} className="text-center mt-8">
          <Link
            to="/products"
            className={`btn-outline btn inline-flex items-center gap-2 motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
          >
            View All Products
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════
          TRUST STATS
          Same gradient as hero — bg-gradient-to-r from-primary-600 to-primary-200
          Mirrors Home.jsx hero pattern for visual cohesion
      ══════════════════════════════ */}
      <section aria-label="Company statistics" className="py-16 md:py-20 bg-gradient-to-r from-primary-600 to-primary-200 relative overflow-hidden">
        <h2 className="sr-only">Our Numbers</h2>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '36px 36px' }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.08} className="text-center">
                <div
                  className="text-3xl md:text-4xl font-bold text-white tabular-nums"
                  aria-label={`${stat.prefix || ''}${stat.end}${stat.suffix} ${stat.label}`}
                >
                  <CountUp
                    end={stat.end}
                    suffix={stat.suffix}
                    prefix={stat.prefix || ''}
                    decimals={stat.decimals || 0}
                    duration={2.2}
                  />
                </div>
                <p className="mt-2 text-blue-100 text-sm font-medium">{stat.label}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          WHY VTECH
          bg-white — matching site's alternating section pattern
      ══════════════════════════════ */}
      <Section id="why-vtech" ariaLabel="Why choose VTech Kitchen" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Why VTech Kitchen"
          title="Businesses Choose Us For a Reason"
          subtitle="We manufacture, sell, and support — no middlemen, no compromise on quality."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.05}>
              <div className="card group flex flex-col gap-3 p-5 hover:border-primary-300">
                <div className="w-11 h-11 rounded-lg bg-gray-900 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-[background-color,transform] duration-300">
                  <feat.icon className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{feat.title}</h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════
          RESOURCES
          bg-gray-50 — matches site alternating pattern
      ══════════════════════════════ */}
      <Section id="resources" ariaLabel="Learning resources" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Resources"
          title="Learn, Watch &amp; Get Support"
          subtitle="Everything you need to get the most from your VTech machine."
        />
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {RESOURCES.map((res, i) => {
            const { tag: Tag, props } = linkable(res.href);
            return (
              <FadeIn key={res.label} delay={i * 0.08}>
                <Tag
                  {...props}
                  aria-label={res.label}
                  className={`card flex items-center gap-4 p-5 hover:border-primary-300 group ${FOCUS_RING}`}
                >
                  <div className={`w-11 h-11 rounded-lg ${res.iconClass} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-300`}>
                    <res.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{res.label}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{res.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-primary-600 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-[color,transform] duration-300" aria-hidden="true" />
                </Tag>
              </FadeIn>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════
          BUSINESS SERVICES
          bg-white — alternating
      ══════════════════════════════ */}
      <Section id="business" ariaLabel="Business services" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Business Services"
          title="Grow With VTech Kitchen"
          subtitle="Dealer programs, bulk pricing, and live demos — we partner for your growth."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((svc, i) => {
            const { tag: Tag, props } = linkable(svc.href);
            return (
              <FadeIn key={svc.label} delay={i * 0.07}>
                <Tag
                  {...props}
                  aria-label={svc.label}
                  className={`card-lift flex flex-col gap-4 p-6 h-full group hover:border-primary-300 ${FOCUS_RING}`}
                >
                  <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 group-hover:border-primary-600 group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-[background-color,border-color,transform] duration-300">
                    <svc.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{svc.label}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">{svc.desc}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-2.5 transition-[gap] duration-300">
                    Get Started <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </Tag>
              </FadeIn>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════
          SOCIAL MEDIA
          bg-gray-50 — alternating
      ══════════════════════════════ */}
      <Section id="social" ariaLabel="Social media" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Follow Us"
          title="Stay Connected"
          subtitle="Product launches, demo videos, and exclusive offers — all on social media."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {SOCIALS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow VTech Kitchen on ${s.label}`}
                className={`card group flex flex-col items-center gap-3 p-6 hover:border-primary-300 text-center ${FOCUS_RING}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 ${s.hoverBg} flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:text-white group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-[background-color,color,transform] duration-300 flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.label}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{s.handle}</p>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════
          CONTACT + MAP
          bg-white — alternating
      ══════════════════════════════ */}
      <Section id="contact" ariaLabel="Contact information" className="bg-white dark:bg-gray-900">
        <SectionTitle
          eyebrow="Contact"
          title="Reach Us Anytime"
          subtitle="Multiple channels to connect — pick what works best for you."
        />
        <div className="grid lg:grid-cols-2 gap-6 max-w-4xl mx-auto">

          <FadeIn>
            <ul className="space-y-3 list-none" role="list">
              {[
                { href: PHONE_HREF,  icon: Phone,         label: 'Call Us',   value: PHONE_DISPLAY,                     bg: 'bg-gradient-to-r from-primary-600 to-primary-700' },
                { href: WA_HREF,     icon: MessageCircle, label: 'WhatsApp',  value: 'Chat with us instantly',           bg: 'bg-green-500' },
                { href: EMAIL_HREF,  icon: Mail,          label: 'Email',     value: 'vtechshop.customercare@gmail.com', bg: 'bg-gradient-to-r from-primary-500 to-primary-600' },
                { href: MAPS_HREF,   icon: MapPin,        label: 'Location',  value: 'Ganapathy, Coimbatore, TN',        bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
              ].map((item) => {
                const { tag: Tag, props } = linkable(item.href);
                return (
                  <li key={item.label}>
                    <Tag
                      {...props}
                      aria-label={`${item.label}: ${item.value}`}
                      className={`card flex items-center gap-4 p-4 hover:border-primary-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 group ${FOCUS_RING}`}
                    >
                      <div className={`w-11 h-11 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-300`}>
                        <item.icon className="w-5 h-5 text-white" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">{item.label}</p>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5 truncate">{item.value}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0 group-hover:text-primary-600 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 transition-[color,transform] duration-300" aria-hidden="true" />
                    </Tag>
                  </li>
                );
              })}

              <li className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">Business Hours</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    <time>Mon – Sat · 9:00 AM – 6:00 PM IST</time>
                  </p>
                </div>
              </li>
            </ul>
          </FadeIn>

          {/* Embedded map — explicit dimensions prevent CLS */}
          <FadeIn delay={0.15} className="h-full min-h-[320px]">
            <div className="w-full h-full min-h-[320px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-soft">
              <iframe
                src={MAPS_EMBED}
                width="600"
                height="320"
                style={{ width: '100%', minHeight: 320, border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="VTech Kitchen Store Location — Ganapathy, Coimbatore"
                aria-label="Map showing VTech Kitchen location in Ganapathy, Coimbatore, Tamil Nadu"
              />
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ══════════════════════════════
          HUB FOOTER — semantic <footer> + <nav>
      ══════════════════════════════ */}
      <footer className="bg-gray-900 dark:bg-gray-950 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <img
              src="/cropped-vtech-logo.webp"
              alt=""
              width={112}
              height={28}
              className="h-7 w-auto brightness-0 invert opacity-40"
              loading="lazy"
              decoding="async"
              aria-hidden="true"
            />
            <span>© {CURRENT_YEAR} VTech Kitchen. All rights reserved.</span>
          </div>
          <nav aria-label="Hub footer navigation">
            <ul className="flex items-center gap-5 list-none" role="list">
              <li><Link to="/"             className={`hover:text-white transition-colors py-1 ${FOCUS_RING}`}>vtechkitchen.com</Link></li>
              <li><Link to="/page/privacy" className={`hover:text-white transition-colors py-1 ${FOCUS_RING}`}>Privacy</Link></li>
              <li><Link to="/page/terms"   className={`hover:text-white transition-colors py-1 ${FOCUS_RING}`}>Terms</Link></li>
            </ul>
          </nav>
        </div>
      </footer>

      {/* Back to top — matches site's primary-600 button pattern */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })}
            className={`fixed bottom-24 right-5 z-40 w-11 h-11 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-glow flex items-center justify-center hover:shadow-glow-lg transition-shadow duration-200 ${FOCUS_RING}`}
            aria-label="Scroll back to top"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default Hub;
