// Wrapper component for scroll-triggered reveal animations
import useScrollReveal from '@/hooks/useScrollReveal';

const animations = {
  fadeUp: {
    hidden: { opacity: 0, transform: 'translateY(40px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeLeft: {
    hidden: { opacity: 0, transform: 'translateX(-40px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  fadeRight: {
    hidden: { opacity: 0, transform: 'translateX(40px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  scaleUp: {
    hidden: { opacity: 0, transform: 'scale(0.9)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
};

const ScrollReveal = ({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.6,
  className = '',
  as: Tag = 'div',
  threshold,
  rootMargin,
}) => {
  const { ref, isVisible } = useScrollReveal({ threshold, rootMargin });
  const anim = animations[animation] || animations.fadeUp;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...(!isVisible ? anim.hidden : anim.visible),
        transition: `opacity ${duration}s ease, transform ${duration}s ease`,
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </Tag>
  );
};

export default ScrollReveal;
