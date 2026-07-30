import { useState, useEffect } from 'react';

const mediaStyle = (asset) => {
  const fx = asset?.focalX ?? 50;
  const fy = asset?.focalY ?? 50;
  const z  = asset?.zoom   ?? 1;
  return {
    objectPosition: `${fx}% ${fy}%`,
    ...(z > 1 ? { transform: `scale(${z})`, transformOrigin: `${fx}% ${fy}%` } : {}),
  };
};

const BASE = 'absolute inset-0 w-full h-full object-cover pointer-events-none select-none';

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
          className={`${BASE} md:hidden`}
          loading="eager"
          decoding="sync"
          style={mediaStyle(mobile)}
        />
        <img
          src={deskUrl}
          alt=""
          aria-hidden="true"
          className={`${BASE} hidden md:block`}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          style={mediaStyle(desktop)}
        />
      </>
    );
  }
  return (
    <img
      src={deskUrl}
      alt=""
      aria-hidden="true"
      className={BASE}
      loading="eager"
      fetchPriority="high"
      decoding="sync"
      style={mediaStyle(desktop)}
    />
  );
};

export const HeroBgVideo = ({ desktop, mobile, poster, mobilePoster, settings, reduced }) => {
  const [useMobileVid,   setUseMobileVid]   = useState(false);
  const [showFallback,   setShowFallback]   = useState(false);
  const [videoReady,     setVideoReady]     = useState(false);
  const [posterHidden,   setPosterHidden]   = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(
    () => reduced || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setUseMobileVid(mq.matches);
    const handler = (e) => setUseMobileVid(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReduced(reduced || e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [reduced]);

  const videoAsset  = (useMobileVid && mobile?.url)        ? mobile       : desktop;
  const posterAsset = (useMobileVid && mobilePoster?.url)  ? mobilePoster : poster;
  const videoSrc    = videoAsset?.url;
  const posterSrc   = posterAsset?.url;
  const shouldPlay  = settings?.autoplay !== false && !prefersReduced;

  // Reset when the source changes (e.g. breakpoint flip desktop↔mobile)
  useEffect(() => {
    setVideoReady(false);
    setPosterHidden(false);
  }, [videoSrc]);

  // onPlaying fires when frames are actually being rendered — safer than onCanPlay
  const handlePlaying = () => {
    if (!prefersReduced) setVideoReady(true);
  };

  // After the poster's opacity transition finishes, pull it from layout to free memory
  const handlePosterTransitionEnd = (e) => {
    if (e.propertyName === 'opacity' && videoReady) setPosterHidden(true);
  };

  // Video missing or broken — poster only
  if (!videoSrc || showFallback) {
    return posterSrc ? (
      <img
        src={posterSrc}
        alt=""
        aria-hidden="true"
        className={BASE}
        loading="eager"
        fetchPriority="high"
        decoding="sync"
        style={mediaStyle(posterAsset)}
      />
    ) : null;
  }

  return (
    <>
      {/* Poster: fully visible initially; fades to opacity-0 when video plays; removed from layout after fade */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          className={BASE}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          style={{
            ...mediaStyle(posterAsset),
            opacity:    videoReady ? 0 : 1,
            transition: 'opacity 500ms ease',
            display:    posterHidden ? 'none' : undefined,
          }}
          onTransitionEnd={handlePosterTransitionEnd}
        />
      )}

      {/* Video: invisible until actually playing; fades to opacity-1 on onPlaying */}
      <video
        key={videoSrc}
        src={videoSrc}
        autoPlay={shouldPlay}
        loop={settings?.loop !== false}
        muted={settings?.muted !== false}
        playsInline={settings?.playsInline !== false}
        onPlaying={handlePlaying}
        onError={() => setShowFallback(true)}
        aria-hidden="true"
        className={BASE}
        style={{
          opacity:    videoReady ? 1 : 0,
          transition: 'opacity 500ms ease',
        }}
      />
    </>
  );
};
