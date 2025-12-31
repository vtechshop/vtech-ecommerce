// FILE: src/assets/components/common/LazyImage.jsx
// Optimized Lazy Loading Image Component with Blur Effect
import { useState, useEffect, useRef } from 'react';
import { mark, measure } from '../../utils/webVitals';

/**
 * LazyImage component with native lazy loading and blur-up effect
 * Uses Intersection Observer for better performance
 *
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for image
 * @param {string} className - CSS classes
 * @param {string} placeholder - Low-res placeholder image (optional)
 * @param {string} width - Image width
 * @param {string} height - Image height
 * @param {function} onLoad - Callback when image loads
 * @param {object} ...props - Additional props passed to img element
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  placeholder = null,
  width,
  height,
  onLoad,
  onError,
  loading,
  decoding,
  crossOrigin,
  referrerPolicy,
  sizes,
  srcSet,
  useMap,
  id,
  'data-testid': dataTestId,
  ...unsafeProps
}) => {
  // Security: Log warning if unsafe props are passed
  if (Object.keys(unsafeProps).length > 0) {
    console.warn('LazyImage: Ignoring unsafe props:', Object.keys(unsafeProps));
  }
  const [imageSrc, setImageSrc] = useState(placeholder || null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Mark the start of image loading for performance tracking
    const imageId = `image-load-${src.split('/').pop()}`;
    mark(`${imageId}-start`);

    // Set up Intersection Observer for lazy loading
    if (!isInView) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              if (observerRef.current && imgRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image enters viewport
          threshold: 0.01,
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    }

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, isInView]);

  useEffect(() => {
    // Only load the full image when it's in view
    if (isInView && src) {
      const imageId = `image-load-${src.split('/').pop()}`;

      // Create a new image element to preload
      const img = new Image();

      img.onload = () => {
        setImageSrc(src);
        setImageLoaded(true);

        // Measure image load time
        measure(`${imageId}`, `${imageId}-start`, undefined);

        // Call custom onLoad callback if provided
        if (onLoad) {
          onLoad();
        }
      };

      img.onerror = () => {
        // Fallback to broken image or placeholder
        console.warn(`Failed to load image: ${src}`);
        setImageLoaded(true); // Still mark as "loaded" to remove blur effect
      };

      // Start loading the image
      img.src = src;
    }
  }, [isInView, src, onLoad]);

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: width || '100%',
        height: height || 'auto',
      }}
    >
      <img
        src={imageSrc || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3C/svg%3E'}
        alt={alt}
        loading={loading || "lazy"}
        decoding={decoding || "async"}
        crossOrigin={crossOrigin}
        referrerPolicy={referrerPolicy}
        sizes={sizes}
        srcSet={srcSet}
        useMap={useMap}
        onError={onError}
        id={id}
        data-testid={dataTestId}
        className={`lazy-image ${imageLoaded ? 'loaded' : 'loading'}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'filter 0.3s ease-in-out, opacity 0.3s ease-in-out',
          filter: imageLoaded ? 'blur(0px)' : 'blur(10px)',
          opacity: imageLoaded ? 1 : 0.7,
        }}
        width={width}
        height={height}
      />

      {/* Loading spinner overlay */}
      {!imageLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      {/* CSS animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LazyImage;
