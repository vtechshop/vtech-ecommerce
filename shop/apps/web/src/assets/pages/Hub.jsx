import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ShoppingBag, Phone, Mail, MapPin, MessageCircle,
  Package, Shield, FileText, CheckCircle, ArrowRight,
  Clock, BookOpen, Headphones, Building2, TrendingUp,
  ChevronRight, Star, Users, Youtube,
} from 'lucide-react';
import SEO from '@/components/common/SEO';
import CountUp from '@/components/animations/CountUp';

/* ── Contact constants (single source of truth) ── */
const PHONE_HREF = 'tel:+919944556683';
const PHONE_DISPLAY = '+91 99445 56683';
const WA_HREF = 'https://wa.me/919944556683?text=Hi%2C%20I%27m%20interested%20in%20VTech%20Kitchen%20products';
const EMAIL_HREF = 'mailto:vtechshop.customercare@gmail.com';
const YOUTUBE_HREF = 'https://www.youtube.com/@makethingsbest';
const MAPS_HREF = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';
const INSTAGRAM_HREF = 'https://instagram.com';
const FACEBOOK_HREF = 'https://facebook.com';
const LINKEDIN_HREF = 'https://linkedin.com';

/* ── Reusable FadeIn wrapper ── */
const FadeIn = ({ children, delay = 0, className = '', y = 20 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Section wrapper ── */
const Section = ({ children, className = '', id }) => (
  <section id={id} className={`py-16 md:py-24 ${className}`}>
    <div className="max-w-5xl mx-auto px-5 sm:px-6">{children}</div>
  </section>
);

/* ── Section title block ── */
const SectionTitle = ({ eyebrow, title, subtitle, light = false }) => (
  <FadeIn className="text-center mb-12 md:mb-16">
    {eyebrow && (
      <p className={`text-xs font-bold tracking-[0.2em] uppercase mb-3 ${light ? 'text-blue-300' : 'text-primary-600 dark:text-blue-400'}`}>
        {eyebrow}
      </p>
    )}
    <h2 className={`text-3xl md:text-4xl font-bold tracking-tight ${light ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`mt-4 max-w-2xl mx-auto leading-relaxed ${light ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
        {subtitle}
      </p>
    )}
  </FadeIn>
);

/* ── Schema.org structured data ── */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VTech Kitchen',
  url: 'https://www.vtechkitchen.com',
  logo: 'https://www.vtechkitchen.com/cropped-vtech-logo.webp',
  description: 'Commercial Kitchen Equipment Manufacturer. Professional kitchen machines for restaurants, hotels, and food businesses across India.',
  contactPoint: [{
    '@type': 'ContactPoint',
    telephone: '+91-99445-56683',
    contactType: 'customer service',
    availableLanguage: ['English', 'Tamil'],
  }],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Ganapathy',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
  },
  sameAs: [YOUTUBE_HREF, INSTAGRAM_HREF, FACEBOOK_HREF, LINKEDIN_HREF],
};

/* ═══════════════════════════════════════
   DATA
═══════════════════════════════════════ */
const QUICK_ACTIONS = [
  { label: 'Shop Products', desc: 'Browse all machines', icon: ShoppingBag, href: '/products', external: false, color: 'bg-blue-600', glow: 'hover:shadow-blue-100 dark:hover:shadow-blue-900/30' },
  { label: 'Call Now', desc: PHONE_DISPLAY, icon: Phone, href: PHONE_HREF, external: false, color: 'bg-sky-500', glow: 'hover:shadow-sky-100 dark:hover:shadow-sky-900/30' },
  { label: 'WhatsApp', desc: 'Chat instantly', icon: MessageCircle, href: WA_HREF, external: true, color: 'bg-green-500', glow: 'hover:shadow-green-100 dark:hover:shadow-green-900/30' },
  { label: 'Find Us', desc: 'Ganapathy, Coimbatore', icon: MapPin, href: MAPS_HREF, external: true, color: 'bg-emerald-600', glow: 'hover:shadow-emerald-100 dark:hover:shadow-emerald-900/30' },
  { label: 'Email Us', desc: 'Get a quick reply', icon: Mail, href: EMAIL_HREF, external: false, color: 'bg-violet-600', glow: 'hover:shadow-violet-100 dark:hover:shadow-violet-900/30' },
  { label: 'Track Order', desc: 'Real-time updates', icon: Package, href: '/track-order', external: false, color: 'bg-orange-500', glow: 'hover:shadow-orange-100 dark:hover:shadow-orange-900/30' },
  { label: 'Warranty', desc: 'Check your coverage', icon: Shield, href: '/warranty-check', external: false, color: 'bg-amber-500', glow: 'hover:shadow-amber-100 dark:hover:shadow-amber-900/30' },
];

const CATEGORIES = [
  { emoji: '🥬', label: 'Vegetable Cutting Machines', href: '/search?q=vegetable+cutting+machine' },
  { emoji: '🫓', label: 'Chapati Press Machines', href: '/search?q=chapati+press' },
  { emoji: '🌀', label: 'Wet Grinders', href: '/search?q=wet+grinder' },
  { emoji: '🥥', label: 'Coconut Scrapers', href: '/search?q=coconut+scraper' },
  { emoji: '🥔', label: 'Potato Slicers', href: '/search?q=potato+slicer' },
  { emoji: '🥣', label: 'Dough Kneaders', href: '/search?q=dough+kneader' },
];

const RESOURCES = [
  { icon: Youtube, label: 'Watch on YouTube', desc: 'Product demos & machine videos', href: YOUTUBE_HREF, external: true, iconClass: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  { icon: BookOpen, label: 'Read Our Blog', desc: 'Tips, guides & kitchen news', href: '/blog', external: false, iconClass: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  { icon: FileText, label: 'User Manuals', desc: 'Setup & usage documentation', href: '/page/contact', external: false, iconClass: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300' },
  { icon: Headphones, label: 'Customer Support', desc: 'We respond within hours', href: '/page/contact', external: false, iconClass: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
];

const SERVICES = [
  { icon: Building2, label: 'Become a Dealer', desc: 'Join our dealer network across India', href: '/page/contact', external: false, color: 'bg-blue-600' },
  { icon: FileText, label: 'Request a Quote', desc: 'Pricing tailored to your needs', href: '/page/contact', external: false, color: 'bg-violet-600' },
  { icon: Star, label: 'Book a Product Demo', desc: 'See machines working live', href: WA_HREF, external: true, color: 'bg-amber-500' },
  { icon: TrendingUp, label: 'Bulk Purchase', desc: 'Special rates for large orders', href: WA_HREF, external: true, color: 'bg-green-600' },
  { icon: Users, label: 'Contact Sales', desc: 'Talk directly to our team', href: PHONE_HREF, external: false, color: 'bg-sky-600' },
];

const TRUST_POINTS = [
  ['Direct Manufacturer', 'No middlemen, no markup'],
  ['Factory Pricing', 'Best rates in the market'],
  ['Premium Quality', 'Industrial-grade materials'],
  ['Fast Delivery', 'Pan India logistics'],
  ['All India Shipping', 'We deliver anywhere'],
  ['One Year Warranty', 'On every machine sold'],
  ['Customer Support', 'Dedicated helpline'],
];

const STATS = [
  { end: 10000, suffix: '+', label: 'Happy Customers' },
  { end: 500, suffix: '+', label: 'Machine Models' },
  { end: 7, suffix: '+', label: 'Years of Trust' },
  { end: 28, suffix: '', label: 'States Served' },
];

const SOCIALS = [
  {
    label: 'YouTube', handle: '@makethingsbest', href: YOUTUBE_HREF, bg: 'bg-red-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  {
    label: 'Instagram', handle: '@vtechkitchen', href: INSTAGRAM_HREF, bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>,
  },
  {
    label: 'Facebook', handle: 'VTech Kitchen', href: FACEBOOK_HREF, bg: 'bg-blue-600',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    label: 'LinkedIn', handle: 'VTech Kitchen', href: LINKEDIN_HREF, bg: 'bg-sky-700',
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
];

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
const Hub = () => (
  <>
    <SEO
      title="Quick Hub — VTech Kitchen | Commercial Kitchen Equipment"
      description="Shop commercial kitchen machines, get a quote, book a demo, or contact VTech Kitchen — everything in one place. Trusted by 10,000+ businesses across India."
      url="https://www.vtechkitchen.com/hub"
      keywords="VTech Kitchen, commercial kitchen equipment, vegetable cutting machine, chapati press, wet grinder, Coimbatore"
      structuredData={STRUCTURED_DATA}
    />

    {/* ═══ HERO ═══ */}
    <section className="relative min-h-[82vh] flex flex-col items-center justify-center bg-gray-950 overflow-hidden">
      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      {/* Blue radial glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 0%, rgba(37,99,235,0.2) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src="/cropped-vtech-logo.webp"
            alt="VTech Kitchen"
            className="h-16 w-auto mx-auto mb-8 brightness-0 invert"
            loading="eager"
          />
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-blue-400 mb-5">
            Commercial Kitchen Equipment Manufacturer
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight">
            Professional Machines
            <span className="block text-blue-400 mt-2">Built to Grow Your Business.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
            Trusted by 10,000+ restaurants, hotels &amp; cloud kitchens across India.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <ShoppingBag className="w-5 h-5" />
              Shop Products
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-green-900/40"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us
            </a>
          </div>
        </motion.div>
      </div>

      {/* fade to white */}
      <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
    </section>

    {/* ═══ QUICK ACTIONS ═══ */}
    <Section id="quick-actions">
      <SectionTitle
        eyebrow="Quick Actions"
        title="Everything In One Place"
        subtitle="Shop, call, chat, or navigate to our store — all at your fingertips."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((item, i) => {
          const isExt = item.external || item.href.startsWith('tel:') || item.href.startsWith('mailto:');
          const Tag = isExt ? 'a' : Link;
          const linkProps = isExt
            ? { href: item.href, target: item.href.startsWith('http') ? '_blank' : undefined, rel: item.href.startsWith('http') ? 'noopener noreferrer' : undefined }
            : { to: item.href };
          return (
            <FadeIn key={item.label} delay={i * 0.06} className="h-full">
              <Tag
                {...linkProps}
                className={`flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl ${item.glow} transition-all duration-300 hover:-translate-y-1 h-full group`}
              >
                <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-300 mt-auto transition-colors" />
              </Tag>
            </FadeIn>
          );
        })}
      </div>
    </Section>

    {/* ═══ PRODUCT CATEGORIES ═══ */}
    <Section id="products" className="bg-gray-50 dark:bg-gray-800/30">
      <SectionTitle
        eyebrow="Our Products"
        title="Explore Our Machines"
        subtitle="Industrial-grade kitchen equipment for professional food businesses."
      />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CATEGORIES.map((cat, i) => (
          <FadeIn key={cat.label} delay={i * 0.06}>
            <Link
              to={cat.href}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
            >
              <span className="text-3xl flex-shrink-0 leading-none">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1 min-w-0">
                {cat.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-blue-400 transition-colors" />
            </Link>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={0.35} className="text-center mt-8">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-200"
        >
          View All Products
          <ArrowRight className="w-4 h-4" />
        </Link>
      </FadeIn>
    </Section>

    {/* ═══ TRUST STATS ═══ */}
    <section className="py-16 md:py-24 bg-gray-950">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                <CountUp end={stat.end} suffix={stat.suffix} duration={2.5} />
              </div>
              <p className="mt-2 text-gray-400 text-sm font-medium">{stat.label}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>

    {/* ═══ WHY VTECH ═══ */}
    <Section id="why-vtech">
      <SectionTitle
        eyebrow="Why VTech Kitchen"
        title="Businesses Choose Us For a Reason"
        subtitle="We manufacture, sell, and support — with no middlemen and no compromise on quality."
      />
      <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
        {TRUST_POINTS.map(([bold, rest], i) => (
          <FadeIn key={bold} delay={i * 0.07}>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">{bold}</span>
                <span className="text-gray-500 dark:text-gray-400"> — {rest}</span>
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>

    {/* ═══ RESOURCES ═══ */}
    <Section id="resources" className="bg-gray-50 dark:bg-gray-800/30">
      <SectionTitle
        eyebrow="Resources"
        title="Learn, Watch &amp; Get Support"
      />
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {RESOURCES.map((res, i) => {
          const Tag = res.external ? 'a' : Link;
          const linkProps = res.external
            ? { href: res.href, target: '_blank', rel: 'noopener noreferrer' }
            : { to: res.href };
          return (
            <FadeIn key={res.label} delay={i * 0.08}>
              <Tag
                {...linkProps}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${res.iconClass}`}>
                  <res.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{res.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{res.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 group-hover:text-blue-400 transition-colors" />
              </Tag>
            </FadeIn>
          );
        })}
      </div>
    </Section>

    {/* ═══ BUSINESS SERVICES ═══ */}
    <Section id="business">
      <SectionTitle
        eyebrow="Business Services"
        title="Grow With VTech Kitchen"
        subtitle="Dealer programs, bulk pricing, live demos — we partner for your growth."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((svc, i) => {
          const isExt = svc.external || svc.href.startsWith('tel:') || svc.href.startsWith('mailto:');
          const Tag = isExt ? 'a' : Link;
          const linkProps = isExt
            ? { href: svc.href, target: svc.href.startsWith('http') ? '_blank' : undefined, rel: svc.href.startsWith('http') ? 'noopener noreferrer' : undefined }
            : { to: svc.href };
          return (
            <FadeIn key={svc.label} delay={i * 0.07}>
              <Tag
                {...linkProps}
                className="flex flex-col gap-4 p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group h-full"
              >
                <div className={`w-11 h-11 rounded-xl ${svc.color} flex items-center justify-center flex-shrink-0`}>
                  <svc.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{svc.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{svc.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-2.5 transition-all">
                  Get Started <ArrowRight className="w-4 h-4" />
                </div>
              </Tag>
            </FadeIn>
          );
        })}
      </div>
    </Section>

    {/* ═══ SOCIAL MEDIA ═══ */}
    <Section id="social" className="bg-gray-50 dark:bg-gray-800/30">
      <SectionTitle
        eyebrow="Follow Us"
        title="Stay Connected"
        subtitle="Follow VTech Kitchen for product updates, machine demos, and exclusive offers."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {SOCIALS.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.08}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center"
            >
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center text-white flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.handle}</p>
              </div>
            </a>
          </FadeIn>
        ))}
      </div>
    </Section>

    {/* ═══ CONTACT ═══ */}
    <Section id="contact">
      <SectionTitle
        eyebrow="Contact"
        title="Reach Us Anytime"
        subtitle="Multiple ways to connect — pick whatever works best for you."
      />
      <FadeIn className="max-w-2xl mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-8 md:p-10 border border-gray-100 dark:border-gray-700">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { href: PHONE_HREF, color: 'bg-blue-600', icon: Phone, label: 'Call Us', value: PHONE_DISPLAY, hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
              { href: WA_HREF, color: 'bg-green-500', icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us instantly', hover: 'hover:bg-green-50 dark:hover:bg-green-900/20', external: true },
              { href: EMAIL_HREF, color: 'bg-violet-600', icon: Mail, label: 'Email', value: 'vtechshop.customercare@gmail.com', hover: 'hover:bg-violet-50 dark:hover:bg-violet-900/20' },
              { href: MAPS_HREF, color: 'bg-emerald-600', icon: MapPin, label: 'Location', value: 'Ganapathy, Coimbatore', hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20', external: true },
            ].map((item) => {
              const Tag = item.external || item.href.startsWith('tel:') || item.href.startsWith('mailto:') ? 'a' : Link;
              const linkProps = Tag === 'a'
                ? { href: item.href, target: item.href.startsWith('http') ? '_blank' : undefined, rel: item.href.startsWith('http') ? 'noopener noreferrer' : undefined }
                : { to: item.href };
              return (
                <Tag
                  key={item.label}
                  {...linkProps}
                  className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-700 ${item.hover} transition-colors`}
                >
                  <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.value}</p>
                  </div>
                </Tag>
              );
            })}

            {/* Business hours — full width */}
            <div className="sm:col-span-2 flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-700">
              <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Business Hours</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Monday – Saturday · 9:00 AM – 6:00 PM IST</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>

    {/* ═══ HUB FOOTER ═══ */}
    <div className="bg-gray-950 py-8 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} VTech Kitchen. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-white transition-colors">vtechkitchen.com</Link>
          <Link to="/page/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/page/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  </>
);

export default Hub;
