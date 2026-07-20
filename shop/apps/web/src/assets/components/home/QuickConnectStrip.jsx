// FILE: apps/web/src/components/home/QuickConnectStrip.jsx
// Three pill-shaped CTA buttons below the hero banner.
// Update constants below to change links / phone numbers.

const YOUTUBE_URL = 'https://www.youtube.com/@makethingsbest';
const PHONE_TEL   = 'tel:+919944556683';
const PHONE_LABEL = 'Call Now';
const MAPS_URL    = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';

// ─── Icons ────────────────────────────────────────────────────────────────────

const YTIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
  </svg>
);

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

// ─── Button data ──────────────────────────────────────────────────────────────

const BUTTONS = [
  {
    id: 'yt',
    href: YOUTUBE_URL,
    external: true,
    icon: <YTIcon />,
    label: 'Watch Demo',
    ariaLabel: 'Watch VTECH Kitchen product demos on YouTube',
  },
  {
    id: 'call',
    href: PHONE_TEL,
    external: false,
    icon: <PhoneIcon />,
    label: PHONE_LABEL,
    ariaLabel: 'Call VTECH Kitchen',
  },
  {
    id: 'maps',
    href: MAPS_URL,
    external: true,
    icon: <PinIcon />,
    label: 'Get Directions',
    ariaLabel: 'Get directions to VTECH Kitchen store in Coimbatore',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const QuickConnectStrip = () => (
  <>
    <style>{`
      /* Section wrapper */
      .qca-section {
        background: #020617;     /* slate-950 — bridges hero to page */
        padding: 20px 16px 24px;
      }

      /* Button grid */
      .qca-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        max-width: 780px;
        margin: 0 auto;
      }

      /* Tablet: 2 cols, 3rd button centred below */
      @media (min-width: 560px) and (max-width: 767px) {
        .qca-grid { grid-template-columns: 1fr 1fr; }
        .qca-grid a:nth-child(3) {
          grid-column: span 2;
          max-width: 50%;
          margin-left: auto;
          margin-right: auto;
        }
      }

      /* Desktop: 3 equal columns */
      @media (min-width: 768px) {
        .qca-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
      }

      /* Pill button base */
      .qca-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        height: 58px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05);
        color: rgba(255,255,255,0.9);
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-decoration: none;
        cursor: pointer;
        transition: transform 0.25s ease, box-shadow 0.25s ease,
                    background 0.25s ease, border-color 0.25s ease;
        white-space: nowrap;
      }

      /* Icon circle */
      .qca-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.25s ease;
      }

      .qca-btn:hover .qca-icon {
        transform: scale(1.15);
      }

      /* YouTube */
      .qca-btn-yt .qca-icon { background: rgba(239,68,68,0.15); color: #f87171; }
      .qca-btn-yt:hover {
        transform: translateY(-3px);
        background: rgba(239,68,68,0.12);
        border-color: rgba(239,68,68,0.45);
        box-shadow: 0 8px 28px rgba(239,68,68,0.28);
      }

      /* Call */
      .qca-btn-call .qca-icon { background: rgba(96,165,250,0.15); color: #60a5fa; }
      .qca-btn-call:hover {
        transform: translateY(-3px);
        background: rgba(96,165,250,0.12);
        border-color: rgba(96,165,250,0.45);
        box-shadow: 0 8px 28px rgba(96,165,250,0.28);
      }

      /* Maps */
      .qca-btn-maps .qca-icon { background: rgba(52,211,153,0.15); color: #34d399; }
      .qca-btn-maps:hover {
        transform: translateY(-3px);
        background: rgba(52,211,153,0.12);
        border-color: rgba(52,211,153,0.45);
        box-shadow: 0 8px 28px rgba(52,211,153,0.28);
      }

      /* Active press */
      .qca-btn:active { transform: translateY(0) scale(0.98); }
    `}</style>

    <section className="qca-section" aria-label="Quick actions">
      <div className="qca-grid">
        {BUTTONS.map((btn) => (
          <a
            key={btn.id}
            href={btn.href}
            target={btn.external ? '_blank' : '_self'}
            rel={btn.external ? 'noopener noreferrer' : undefined}
            aria-label={btn.ariaLabel}
            className={`qca-btn qca-btn-${btn.id}`}
          >
            <span className="qca-icon">{btn.icon}</span>
            {btn.label}
          </a>
        ))}
      </div>
    </section>
  </>
);

export default QuickConnectStrip;
