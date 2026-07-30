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
  const [useMobileVid, setUseMobileVid] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [videoReady,   setVideoReady]   = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(
    reduced || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
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

  // Reset ready-state whenever the video source changes (breakpoint switch)
  useEffect(() => { setVideoReady(false); }, [videoSrc]);

  // If reduced motion: show poster permanently, no crossfade
  const handleCanPlay = () => {
    if (!prefersReduced) setVideoReady(true);
  };

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
      {/* Poster stays visible while video buffers, then fades out (500ms). Never blank. */}
      {posterSrc && (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          className={`${BASE} transition-opacity duration-500 ${videoReady ? 'opacity-0' : 'opacity-100'}`}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          style={mediaStyle(posterAsset)}
        />
      )}
      {/* Video starts invisible; crossfades in on canPlay */}
      <video
        key={videoSrc}
        src={videoSrc}
        poster={posterSrc || undefined}
        autoPlay={shouldPlay}
        loop={settings?.loop !== false}
        muted={settings?.muted !== false}
        playsInline={settings?.playsInline !== false}
        onCanPlay={handleCanPlay}
        onLoadedData={handleCanPlay}
        onError={() => setShowFallback(true)}
        aria-hidden="true"
        className={`${BASE} transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
};
