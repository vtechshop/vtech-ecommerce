import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Phone, Mail, MapPin, MessageCircle, Package, Shield,
  FileText, ArrowRight, Clock, BookOpen, Headphones, Building2,
  TrendingUp, ChevronRight, Star, Users, ChevronDown, Tag, Award,
  Zap, Truck, ShieldCheck, ArrowUp, Youtube, Factory,
} from 'lucide-react';
import SEO from '@/components/common/SEO';
import CountUp from '@/components/animations/CountUp';
import api from '@/store/api';

/* ── Contact constants ── */
const PHONE_HREF    = 'tel:+919944556683';
const PHONE_DISPLAY = '+91 99445 56683';
const WA_HREF       = 'https://wa.me/919944556683?text=Hi%2C%20I%27m%20interested%20in%20VTech%20Kitchen%20products';
const EMAIL_HREF    = 'mailto:vtechshop.customercare@gmail.com';
const YOUTUBE_HREF  = 'https://www.youtube.com/@makethingsbest';
const MAPS_HREF     = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';
const MAPS_EMBED    = 'https://maps.google.com/maps?q=Ganapathy+Coimbatore+Tamil+Nadu&t=&z=15&ie=UTF8&iwloc=&output=embed';
const INSTAGRAM_HREF = 'https://instagram.com';
const FACEBOOK_HREF  = 'https://facebook.com';
const LINKEDIN_HREF  = 'https://linkedin.com';

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

const FadeIn = ({ children, delay = 0, className = '', y = 24 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const Section = ({ children, className = '', id }) => (
  <section id={id} className={`py-20 md:py-28 ${className}`}>
    <div className="max-w-6xl mx-auto px-5 sm:px-8">{children}</div>
  </section>
);

const SectionTitle = ({ eyebrow, title, subtitle, light = false }) => (
  <FadeIn className="text-center mb-14 md:mb-18">
    {eyebrow && (
      <p className={`text-[11px] font-bold tracking-[0.22em] uppercase mb-4 ${light ? 'text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
        {eyebrow}
      </p>
    )}
    <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${light ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`mt-5 text-lg max-w-2xl mx-auto leading-relaxed ${light ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
        {subtitle}
      </p>
    )}
  </FadeIn>
);

/* ── Helper to build anchor/Link props ── */
const linkable = (href, external) => {
  if (external || href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')) {
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

/* ── Product skeleton ── */
const ProductSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
    <div className="h-52 bg-gray-100 dark:bg-gray-700 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
      <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-1/3 animate-pulse mt-4" />
    </div>
  </div>
);

/* ── Product card ── */
const ProductCard = ({ product, index }) => {
  const imgSrc = product.images?.[0]?.url || product.images?.[0] || product.image || null;
  return (
    <FadeIn delay={index * 0.07}>
      <Link
        to={`/product/${product.slug}`}
        className="group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-500 hover:-translate-y-1.5 h-full"
      >
        <div className="relative h-52 overflow-hidden bg-gray-50 dark:bg-gray-700">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.title}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-600 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-14 h-14 text-gray-200 dark:text-gray-600" />
            </div>
          )}
          {product.featured && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
              Featured
            </span>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
            {product.title}
          </h3>
          {product.price > 0 && (
            <p className="mt-2 text-base font-bold text-blue-600 dark:text-blue-400">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </p>
          )}
          <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all duration-300">
            View Product <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </FadeIn>
  );
};

/* ══════════════════════════════════════════════
   DATA
══════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  { label: 'Shop Products',  desc: 'Browse all machines',      icon: ShoppingBag, href: '/products',    color: 'bg-blue-600' },
  { label: 'Call Now',       desc: PHONE_DISPLAY,              icon: Phone,       href: PHONE_HREF,     color: 'bg-sky-500' },
  { label: 'WhatsApp',       desc: 'Chat instantly',           icon: MessageCircle, href: WA_HREF,      color: 'bg-green-500' },
  { label: 'Find Our Store', desc: 'Ganapathy, Coimbatore',    icon: MapPin,      href: MAPS_HREF,      color: 'bg-emerald-600' },
  { label: 'Email Us',       desc: 'Quick replies guaranteed', icon: Mail,        href: EMAIL_HREF,     color: 'bg-violet-600' },
  { label: 'Track Order',    desc: 'Real-time updates',        icon: Package,     href: '/track-order', color: 'bg-orange-500' },
  { label: 'Warranty',       desc: 'Check your coverage',      icon: Shield,      href: '/warranty-check', color: 'bg-amber-500' },
];

const FEATURES = [
  { icon: Factory,    title: 'Direct Manufacturer',  desc: 'Own factory, zero intermediaries — pure cost advantage for you.' },
  { icon: Tag,        title: 'Factory Pricing',       desc: 'Industry-best rates because we own the entire supply chain.' },
  { icon: Award,      title: 'Premium Quality',       desc: 'Industrial-grade components built for heavy commercial daily use.' },
  { icon: Zap,        title: 'Fast Dispatch',         desc: 'Quick order processing with reliable logistics partners.' },
  { icon: Truck,      title: 'All India Shipping',    desc: 'From Kanyakumari to Kashmir — we deliver to your doorstep.' },
  { icon: ShieldCheck, title: 'One Year Warranty',   desc: 'Full coverage warranty on every machine we manufacture.' },
  { icon: Headphones, title: 'Dedicated Support',    desc: 'Expert team available to help with setup, service, and spare parts.' },
  { icon: Star,       title: '5-Star Rated',          desc: 'Consistently loved and recommended by 10,000+ happy businesses.' },
];

const STATS = [
  { end: 10000, suffix: '+', label: 'Happy Customers', icon: Users },
  { end: 500,   suffix: '+', label: 'Machine Models',  icon: ShoppingBag },
  { end: 7,     suffix: '+', label: 'Years of Trust',  icon: Award },
  { end: 28,    suffix: '',  label: 'States Served',   icon: MapPin },
  { end: 4.9,   suffix: '/5', decimals: 1, label: 'Customer Rating', icon: Star, prefix: '★ ' },
];

const RESOURCES = [
  { icon: Youtube,    label: 'Watch on YouTube',   desc: 'Product demos & machine videos', href: YOUTUBE_HREF, external: true,  iconClass: 'bg-red-500' },
  { icon: BookOpen,   label: 'Read Our Blog',      desc: 'Tips, guides & industry news',   href: '/blog',      external: false, iconClass: 'bg-blue-600' },
  { icon: FileText,   label: 'User Manuals',       desc: 'Setup & usage documentation',    href: '/page/contact', external: false, iconClass: 'bg-gray-500' },
  { icon: Headphones, label: 'Customer Support',   desc: 'We respond within hours',        href: '/page/contact', external: false, iconClass: 'bg-teal-600' },
];

const SERVICES = [
  { icon: Building2,    label: 'Become a Dealer',      desc: 'Join our network across India',      href: '/page/contact' },
  { icon: FileText,     label: 'Request a Quote',       desc: 'Pricing tailored to your needs',     href: '/page/contact' },
  { icon: Star,         label: 'Book a Product Demo',   desc: 'See machines working live',          href: WA_HREF },
  { icon: TrendingUp,   label: 'Bulk Purchase',         desc: 'Special rates for large orders',     href: WA_HREF },
  { icon: Users,        label: 'Contact Sales',         desc: 'Talk directly to our team',          href: PHONE_HREF },
];

const SOCIALS = [
  {
    label: 'YouTube', handle: '@makethingsbest', href: YOUTUBE_HREF, hoverBg: 'group-hover:bg-red-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  {
    label: 'Instagram', handle: '@vtechkitchen', href: INSTAGRAM_HREF, hoverBg: 'group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-orange-400',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    label: 'Facebook', handle: 'VTech Kitchen', href: FACEBOOK_HREF, hoverBg: 'group-hover:bg-blue-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    label: 'LinkedIn', handle: 'VTech Kitchen', href: LINKEDIN_HREF, hoverBg: 'group-hover:bg-sky-700',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
];

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const Hub = () => {
  const [scrollPct, setScrollPct] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) setScrollPct((window.scrollY / total) * 100);
      setShowTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

      {/* ── Scroll progress bar ── */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 z-50 h-[3px] bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 transition-all duration-100"
        style={{ width: `${scrollPct}%` }}
      />

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center bg-[#080c14] overflow-hidden">

        {/* Concentric ring decoration */}
        <div aria-hidden="true" className="absolute right-[-15%] md:right-[-5%] top-1/2 -translate-y-1/2 pointer-events-none">
          {[900, 680, 460, 280].map((size, i) => (
            <div
              key={size}
              className="absolute rounded-full border border-white"
              style={{
                width: size,
                height: size,
                opacity: 0.025 + i * 0.01,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        {/* Blue glow spot */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(37,99,235,0.22) 0%, transparent 70%)' }}
        />

        {/* Dot grid */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/cropped-vtech-logo.webp"
              alt="VTech Kitchen"
              className="h-16 w-auto mx-auto mb-10 brightness-0 invert"
              loading="eager"
            />
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-[11px] font-bold tracking-[0.3em] uppercase text-blue-400 mb-6"
          >
            Commercial Kitchen Equipment Manufacturer
          </motion.p>

          {/* H1 — word-by-word reveal */}
          <div className="text-4xl sm:text-5xl md:text-[3.6rem] font-bold text-white leading-[1.08] tracking-tight">
            {['Professional', 'Kitchen', 'Machines'].map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mt-2"
            >
              Built to Grow Your Business.
            </motion.span>
          </div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.78, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed"
          >
            Trusted by 10,000+ restaurants, hotels &amp; cloud kitchens across India.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/20 text-[15px]"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop Products
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/30 text-[15px]"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          aria-hidden="true"
        >
          <span className="text-[10px] tracking-widest uppercase text-white/25 font-semibold">Scroll</span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-5 h-5 text-white/25" />
          </motion.div>
        </motion.div>

        {/* Fade to white */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
      </section>

      {/* ══════════════════════════════
          QUICK ACTIONS — dark glassmorphism
      ══════════════════════════════ */}
      <section className="py-20 md:py-28 bg-gray-950 relative overflow-hidden">
        {/* Faint radial */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <SectionTitle
            eyebrow="Quick Actions"
            title="Everything In One Place"
            subtitle="Shop, call, chat, or navigate to our store — instantly."
            light
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((item, i) => {
              const { tag: Tag, props } = linkable(item.href, false);
              return (
                <FadeIn key={item.label} delay={i * 0.06} className="h-full">
                  <Tag
                    {...props}
                    className="relative flex flex-col gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 h-full group cursor-pointer"
                  >
                    <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm leading-tight">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 mt-auto transition-all group-hover:translate-x-0.5" />
                  </Tag>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════ */}
      <Section id="products" className="bg-gray-50 dark:bg-gray-800/30">
        <SectionTitle
          eyebrow="Our Products"
          title="Featured Machines"
          subtitle="Industrial-grade kitchen equipment for restaurants, hotels, cloud kitchens &amp; food factories."
        />

        {productsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        )}

        {hasProducts && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {products.map((p, i) => <ProductCard key={p._id || p.slug} product={p} index={i} />)}
          </div>
        )}

        {/* Fallback: category links if no products */}
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
                <Link to={cat.href} className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
                  <span className="text-3xl leading-none flex-shrink-0">{cat.icon}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                </Link>
              </FadeIn>
            ))}
          </div>
        )}

        <FadeIn delay={0.35} className="text-center mt-10">
          <Link
            to="/products"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white font-bold hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 transition-all duration-300"
          >
            View All Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════
          TRUST STATS — dark
      ══════════════════════════════ */}
      <section className="py-20 md:py-28 bg-gray-950 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(37,99,235,0.07) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.09} className="text-center">
                <div className="text-4xl md:text-5xl font-extrabold text-white tracking-tight tabular-nums">
                  <CountUp
                    end={stat.end}
                    suffix={stat.suffix}
                    prefix={stat.prefix || ''}
                    decimals={stat.decimals || 0}
                    duration={2.2}
                  />
                </div>
                <p className="mt-2.5 text-gray-400 text-sm font-medium">{stat.label}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          WHY VTECH — icon feature grid
      ══════════════════════════════ */}
      <Section id="why-vtech">
        <SectionTitle
          eyebrow="Why VTech Kitchen"
          title="Businesses Choose Us For a Reason"
          subtitle="We manufacture, sell, and support — with no middlemen and zero compromise on quality."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.06}>
              <div className="group flex flex-col gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-1 transition-all duration-400">
                <div className="w-12 h-12 rounded-xl bg-gray-900 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                  <feat.icon className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{feat.title}</p>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════
          RESOURCES
      ══════════════════════════════ */}
      <Section id="resources" className="bg-gray-50 dark:bg-gray-800/30">
        <SectionTitle
          eyebrow="Resources"
          title="Learn, Watch &amp; Get Support"
          subtitle="Everything you need to get the most from your VTech machine."
        />
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {RESOURCES.map((res, i) => {
            const { tag: Tag, props } = linkable(res.href, res.external);
            return (
              <FadeIn key={res.label} delay={i * 0.08}>
                <Tag
                  {...props}
                  className="flex items-center gap-5 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl ${res.iconClass} flex items-center justify-center flex-shrink-0`}>
                    <res.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{res.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{res.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </Tag>
              </FadeIn>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════
          BUSINESS SERVICES
      ══════════════════════════════ */}
      <Section id="business">
        <SectionTitle
          eyebrow="Business Services"
          title="Grow With VTech Kitchen"
          subtitle="Dealer programs, bulk pricing, and live demos — we partner for your growth."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((svc, i) => {
            const { tag: Tag, props } = linkable(svc.href, false);
            return (
              <FadeIn key={svc.label} delay={i * 0.07}>
                <Tag
                  {...props}
                  className="flex flex-col gap-5 p-7 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/30 transition-all duration-400 hover:-translate-y-1.5 group h-full"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                    <svc.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-base">{svc.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{svc.desc}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all duration-300">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </div>
                </Tag>
              </FadeIn>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════
          SOCIAL MEDIA
      ══════════════════════════════ */}
      <Section id="social" className="bg-gray-50 dark:bg-gray-800/30">
        <SectionTitle
          eyebrow="Follow Us"
          title="Stay Connected"
          subtitle="Product launches, demo videos, and exclusive offers — all on social media."
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {SOCIALS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 0.08}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-4 p-7 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/40 hover:-translate-y-1.5 transition-all duration-400 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 ${s.hoverBg} flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:text-white transition-all duration-300 flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.handle}</p>
                </div>
              </a>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════
          CONTACT + MAP
      ══════════════════════════════ */}
      <Section id="contact">
        <SectionTitle
          eyebrow="Contact"
          title="Reach Us Anytime"
          subtitle="Multiple channels to connect — pick what works best for you."
        />

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* Contact cards */}
          <FadeIn className="space-y-4">
            {[
              { href: PHONE_HREF,  icon: Phone,          label: 'Call Us',    value: PHONE_DISPLAY,                    bg: 'bg-blue-600',    hov: 'hover:border-blue-200 dark:hover:border-blue-700' },
              { href: WA_HREF,     icon: MessageCircle,  label: 'WhatsApp',   value: 'Chat with us instantly',         bg: 'bg-green-500',   hov: 'hover:border-green-200 dark:hover:border-green-700', external: true },
              { href: EMAIL_HREF,  icon: Mail,           label: 'Email',      value: 'vtechshop.customercare@gmail.com', bg: 'bg-violet-600', hov: 'hover:border-violet-200 dark:hover:border-violet-700' },
              { href: MAPS_HREF,   icon: MapPin,         label: 'Location',   value: 'Ganapathy, Coimbatore, TN',      bg: 'bg-emerald-600', hov: 'hover:border-emerald-200 dark:hover:border-emerald-700', external: true },
            ].map((item) => {
              const { tag: Tag, props } = linkable(item.href, item.external);
              return (
                <Tag
                  key={item.label}
                  {...props}
                  className={`flex items-center gap-5 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 ${item.hov} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group`}
                >
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold tracking-wider uppercase text-gray-400">{item.label}</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 truncate">{item.value}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0 group-hover:text-blue-500 transition-colors" />
                </Tag>
              );
            })}

            {/* Hours */}
            <div className="flex items-center gap-5 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-gray-400">Business Hours</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">Mon – Sat · 9:00 AM – 6:00 PM IST</p>
              </div>
            </div>
          </FadeIn>

          {/* Embedded map */}
          <FadeIn delay={0.15} className="h-full min-h-[360px]">
            <div className="w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
              <iframe
                src={MAPS_EMBED}
                width="100%"
                height="100%"
                style={{ minHeight: 360, border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="VTech Kitchen Store Location — Ganapathy, Coimbatore"
                aria-label="Google Maps showing VTech Kitchen store location in Ganapathy, Coimbatore"
              />
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ══════════════════════════════
          HUB FOOTER
      ══════════════════════════════ */}
      <div className="bg-gray-950 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-5 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <img src="/cropped-vtech-logo.webp" alt="" className="h-7 w-auto brightness-0 invert opacity-40" aria-hidden="true" />
            <span>© {new Date().getFullYear()} VTech Kitchen. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-white transition-colors">vtechkitchen.com</Link>
            <Link to="/page/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/page/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-5 z-40 w-11 h-11 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl flex items-center justify-center hover:bg-blue-600 dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-300 hover:scale-110"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default Hub;
