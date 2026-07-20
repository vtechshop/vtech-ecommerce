// FILE: apps/web/src/components/home/QuickConnectStrip.jsx
// Quick Connect Strip — shown immediately below the hero banner on the home page.
// Update YOUTUBE_URL, PHONE_PRIMARY, PHONE_SECONDARY, MAPS_URL as needed.

const YOUTUBE_URL   = 'https://www.youtube.com/@makethingsbest';
const PHONE_PRIMARY = '919944556683';
const PHONE_LABEL   = '+91 99445 56683';
const MAPS_URL      = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';

const cards = [
  {
    id: 'youtube',
    href: YOUTUBE_URL,
    target: '_blank',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    title: 'Watch Us On YouTube',
    subtitle: 'Product Demos & Tutorials',
    btnLabel: 'Subscribe',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    glowClass: 'hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]',
    ariaLabel: 'Subscribe to VTECH Kitchen on YouTube',
  },
  {
    id: 'call',
    href: `tel:+${PHONE_PRIMARY}`,
    target: '_self',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
      </svg>
    ),
    title: 'Call Us',
    subtitle: PHONE_LABEL,
    btnLabel: 'Call Now',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    glowClass: 'hover:shadow-[0_8px_30px_rgba(37,99,235,0.25)]',
    ariaLabel: `Call VTECH Kitchen at ${PHONE_LABEL}`,
  },
  {
    id: 'location',
    href: MAPS_URL,
    target: '_blank',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: 'Visit Our Store',
    subtitle: 'Ganapathy, Coimbatore, TN',
    btnLabel: 'Get Directions',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    glowClass: 'hover:shadow-[0_8px_30px_rgba(5,150,105,0.25)]',
    ariaLabel: 'Get directions to VTECH Kitchen store',
  },
];

const QuickConnectStrip = () => (
  <section aria-label="Quick Connect" className="bg-gray-50 py-8 sm:py-10">
    <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-screen-xl">
      {/* Section heading */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Quick Connect
        </h2>
        <p className="text-sm text-gray-500 mt-1">Reach VTECH Kitchen instantly.</p>
      </div>

      {/* 3-card grid: 1 col → 3 col */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {cards.map((card) => (
          <a
            key={card.id}
            href={card.href}
            target={card.target}
            rel={card.target === '_blank' ? 'noopener noreferrer' : undefined}
            aria-label={card.ariaLabel}
            className={[
              'group flex flex-col items-center text-center gap-4 p-6 sm:p-7',
              'bg-white rounded-2xl border border-gray-100',
              'shadow-sm transition-all duration-300 ease-out cursor-pointer',
              'hover:-translate-y-1.5',
              card.glowClass,
            ].join(' ')}
          >
            {/* Coloured icon circle */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}>
              {card.icon}
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-base leading-snug">{card.title}</p>
              <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
            </div>

            {/* CTA button */}
            <span className={`inline-block px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${card.btnClass} group-hover:scale-105 group-hover:shadow-md`}>
              {card.btnLabel}
            </span>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default QuickConnectStrip;
