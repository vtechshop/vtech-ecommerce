// FILE: apps/web/src/components/home/QuickConnectStrip.jsx
// Premium glassmorphism Quick Action Bar — floats over the hero banner bottom.
// To update: change the constants below.

const YOUTUBE_URL = 'https://www.youtube.com/@makethingsbest';
const PHONE_TEL   = 'tel:+919944556683';
const PHONE_LABEL = '+91 99445 56683';
const MAPS_URL    = 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore';

// ─── Icons ────────────────────────────────────────────────────────────────────

const YTIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="qcb-icon" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="qcb-icon" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="qcb-icon" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const ITEMS = [
  {
    id: 'yt',
    href: YOUTUBE_URL,
    external: true,
    icon: <YTIcon />,
    iconClass: 'qcb-icon-yt',
    label: 'YouTube',
    sub: 'Watch Demos & Reviews',
    itemClass: 'qcb-item-yt',
    ariaLabel: 'Subscribe to VTECH Kitchen on YouTube',
  },
  {
    id: 'call',
    href: PHONE_TEL,
    external: false,
    icon: <PhoneIcon />,
    iconClass: 'qcb-icon-call',
    label: PHONE_LABEL,
    sub: 'Call Us Anytime',
    itemClass: 'qcb-item-call',
    ariaLabel: `Call VTECH Kitchen at ${PHONE_LABEL}`,
  },
  {
    id: 'maps',
    href: MAPS_URL,
    external: true,
    icon: <PinIcon />,
    iconClass: 'qcb-icon-map',
    label: 'Coimbatore, Tamil Nadu',
    sub: 'Ganapathy — Get Directions',
    itemClass: 'qcb-item-map',
    ariaLabel: 'Get directions to VTECH Kitchen store',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const QuickConnectStrip = () => (
  <>
    {/* Scoped styles — all class names prefixed qcb- to avoid collisions */}
    <style>{`
      /* Bar */
      .qcb-bar {
        display: flex;
        justify-content: center;
        padding: 0 1rem;
        /* negative margin handled by parent wrapper in Home.jsx */
      }

      .qcb-inner {
        width: 100%;
        max-width: 1100px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.09);
        box-shadow:
          0 24px 64px rgba(0, 0, 0, 0.35),
          0 0 0 1px rgba(255,255,255,0.04) inset;
        overflow: hidden;
        /* Fade-up entrance */
        animation: qcbFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both;
      }

      @keyframes qcbFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0);    }
      }

      /* Items row */
      .qcb-list {
        display: flex;
        flex-direction: column;   /* mobile: stack */
      }

      @media (min-width: 640px) {
        .qcb-list {
          flex-direction: row;
          height: 76px;
        }
      }

      /* Individual item */
      .qcb-item {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 16px 20px;
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.3s ease, background 0.3s ease;
        position: relative;
      }

      /* Dividers */
      .qcb-item + .qcb-item {
        border-top: 1px solid rgba(255,255,255,0.07);
      }

      @media (min-width: 640px) {
        .qcb-item + .qcb-item {
          border-top: none;
          border-left: 1px solid rgba(255,255,255,0.07);
        }
      }

      /* Hover lift */
      .qcb-item:hover {
        transform: translateY(-3px);
        background: rgba(255,255,255,0.04);
      }

      /* Icon circles */
      .qcb-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.3s ease;
      }

      .qcb-item:hover .qcb-icon-wrap {
        transform: scale(1.12);
      }

      .qcb-icon {
        width: 18px;
        height: 18px;
      }

      /* Icon accent colours */
      .qcb-icon-yt  { background: rgba(239, 68, 68, 0.18); color: #f87171; }
      .qcb-icon-call { background: rgba(96, 165, 250, 0.18); color: #60a5fa; }
      .qcb-icon-map  { background: rgba(52, 211, 153, 0.18); color: #34d399; }

      /* Per-item glow on hover */
      .qcb-item-yt:hover   { box-shadow: inset 0 0 40px rgba(239,68,68,0.07); }
      .qcb-item-call:hover { box-shadow: inset 0 0 40px rgba(96,165,250,0.07); }
      .qcb-item-map:hover  { box-shadow: inset 0 0 40px rgba(52,211,153,0.07); }

      /* Text */
      .qcb-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.92);
        line-height: 1.2;
        white-space: nowrap;
      }

      .qcb-sub {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.42);
        margin-top: 2px;
        white-space: nowrap;
      }

      @media (max-width: 380px) {
        .qcb-label { font-size: 0.82rem; }
        .qcb-sub   { display: none; }
      }
    `}</style>

    <div className="qcb-bar">
      <div className="qcb-inner">
        <div className="qcb-list">
          {ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              target={item.external ? '_blank' : '_self'}
              rel={item.external ? 'noopener noreferrer' : undefined}
              aria-label={item.ariaLabel}
              className={`qcb-item ${item.itemClass}`}
            >
              <span className={`qcb-icon-wrap ${item.iconClass}`}>
                {item.icon}
              </span>
              <span>
                <span className="qcb-label">{item.label}</span>
                <span className="qcb-sub">{item.sub}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  </>
);

export default QuickConnectStrip;
