import { useState, useEffect } from 'react';

export const HeroBgImage = ({ desktop, mobile }) => {
  const deskUrl   = desktop?.url;
  const mobileUrl = mobile?.url;
  if (!deskUrl) return null;
  if (mobileUrl) {
    return (
      <>
        <img
          src={mobileUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none md:hidden"
          loading="eager"
          decoding="sync"
        />
        <img
          src={deskUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none hidden md:block"
          loading="eager"
          fetchPriority="high"
          decoding="sync"
        />
      </>
    );
  }
  return (
    <img
      src={deskUrl}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      loading="eager"
      fetchPriority="high"
      decoding="sync"
    />
  );
};

export const HeroBgVideo = ({ desktop, mobile, poster, mobilePoster, settings, reduced }) => {
  const [useMobileVid, setUseMobileVid] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setUseMobileVid(mq.matches);
    const handler = (e) => setUseMobileVid(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const videoSrc  = (useMobileVid && mobile?.url) ? mobile.url : desktop?.url;
  const posterSrc = (useMobileVid && mobilePoster?.url) ? mobilePoster.url : poster?.url;
  const shouldPlay = settings?.autoplay !== false && !reduced;

  if (!videoSrc || showFallback) {
    return posterSrc ? (
      <img
        src={posterSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        loading="eager"
        fetchPriority="high"
        decoding="sync"
      />
    ) : null;
  }

  return (
    <video
      key={videoSrc}
      src={videoSrc}
      poster={posterSrc || undefined}
      autoPlay={shouldPlay}
      loop={settings?.loop !== false}
      muted={settings?.muted !== false}
      playsInline={settings?.playsInline !== false}
      onError={() => setShowFallback(true)}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    />
  );
};
