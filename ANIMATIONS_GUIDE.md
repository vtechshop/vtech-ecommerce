# 🎨 V-Tech E-commerce Animation System

**Date:** November 19, 2025
**Status:** ✅ COMPLETE
**Priority:** HIGH

---

## 📋 Overview

Professional animation system designed for the best e-commerce website experience using your brand colors:

**Brand Colors:**
- `#ffffff` - White
- `#6cdef3` - Cyan (Primary)
- `#13778a` - Teal (Secondary)
- `#6b6b6b` - Gray (Neutral)
- `#262626` - Dark

---

## 🎯 Quick Start

### 1. Import Animations

The animations are already imported in your project:

```css
/* src/index.css */
@import './styles/animations.css';
```

### 2. Use Theme Constants

```jsx
import { BUTTONS, CARDS, COLORS, ANIMATIONS } from '@/constants/theme';

// Use pre-defined button styles
<button className={BUTTONS.primary}>
  Shop Now
</button>

// Use animated cards
<div className={CARDS.product}>
  Product content
</div>
```

### 3. Add Scroll Animations

```jsx
import AnimatedSection from '@/components/common/AnimatedSection';

<AnimatedSection animation="fade-up" delay={200}>
  <h2>Your Content</h2>
</AnimatedSection>
```

---

## 🎭 Animation Classes

### Fade Animations

```jsx
// Fade in
<div className="animate-fade-in">Content</div>

// Fade in from bottom
<div className="animate-fade-in-up">Content</div>

// Fade in from top
<div className="animate-fade-in-down">Content</div>

// Fade in from left
<div className="animate-fade-in-left">Content</div>

// Fade in from right
<div className="animate-fade-in-right">Content</div>
```

### Scale Animations

```jsx
// Scale in
<div className="animate-scale-in">Content</div>

// Hover scale
<div className="hover-scale">Hover me</div>
```

### Slide Animations

```jsx
// Slide up
<div className="animate-slide-in-up">Content</div>

// Slide down
<div className="animate-slide-in-down">Content</div>

// Slide from left
<div className="animate-slide-in-left">Content</div>

// Slide from right
<div className="animate-slide-in-right">Content</div>
```

### Special Effects

```jsx
// Float effect
<div className="animate-float">Floating element</div>

// Pulse effect
<div className="animate-pulse-slow">Pulsing element</div>

// Glow effect
<div className="animate-glow">Glowing element</div>

// Shimmer effect
<div className="animate-shimmer">Shimmering text</div>

// Bounce
<div className="animate-bounce-in">Bouncing element</div>

// Wiggle
<div className="animate-wiggle">Wiggling element</div>
```

---

## 🎨 Button Styles

### Primary Button (Cyan Gradient with Glow)

```jsx
import { BUTTONS } from '@/constants/theme';

<button className={BUTTONS.primary}>
  Add to Cart
</button>
```

**Features:**
- Cyan gradient (`#6cdef3`)
- Glow effect on hover
- Lift animation (-0.5px translateY)
- Active scale effect (0.95)
- Smooth transitions (300ms)

### Secondary Button (Teal Gradient)

```jsx
<button className={BUTTONS.secondary}>
  View Details
</button>
```

**Features:**
- Teal gradient (`#13778a`)
- Teal glow effect on hover
- Same smooth animations as primary

### Outline Button

```jsx
<button className={BUTTONS.outline}>
  Learn More
</button>
```

**Features:**
- Transparent background
- Cyan border
- Fill animation on hover
- Smooth color transition

### Ghost Button

```jsx
<button className={BUTTONS.ghost}>
  Cancel
</button>
```

**Features:**
- Minimal style
- Subtle hover background
- Scale effect on hover/click

---

## 🃏 Card Styles

### Product Card

```jsx
import { CARDS } from '@/constants/theme';

<div className={CARDS.product}>
  <img src="product.jpg" alt="Product" />
  <h3>Product Name</h3>
  <p>$99.99</p>
</div>
```

**Features:**
- Lift animation on hover (-2px translateY)
- Scale effect (1.02)
- Border color change (cyan)
- Shadow enhancement
- 400ms smooth transition

### Hover Card

```jsx
<div className={CARDS.hover}>
  Interactive content
</div>
```

**Features:**
- Lift on hover (-1px translateY)
- Border color change
- Shadow enhancement
- Grouped hover effects

### Featured Card

```jsx
<div className={CARDS.featured}>
  Featured content
</div>
```

**Features:**
- Larger padding
- Enhanced shadow
- Premium appearance
- Smooth hover transitions

### Gradient Card

```jsx
<div className={CARDS.gradient}>
  Gradient background content
</div>
```

**Features:**
- Cyan to white gradient background
- Subtle border
- Hover shadow enhancement

### Glass Card

```jsx
<div className={CARDS.glass}>
  Glass morphism effect
</div>
```

**Features:**
- Frosted glass effect
- Backdrop blur
- Semi-transparent background
- Modern aesthetic

---

## 🎬 Scroll Animations

### Basic Usage

```jsx
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

function MyComponent() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`transition-all duration-600 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      Content appears on scroll
    </div>
  );
}
```

### Animated Section Component

```jsx
import AnimatedSection from '@/components/common/AnimatedSection';

// Fade up animation
<AnimatedSection animation="fade-up">
  <h2>Animated Heading</h2>
</AnimatedSection>

// With delay
<AnimatedSection animation="fade-up" delay={200}>
  <p>Delayed content</p>
</AnimatedSection>

// Different animations
<AnimatedSection animation="slide-left">
  <div>Slides from left</div>
</AnimatedSection>

<AnimatedSection animation="scale-in">
  <div>Scales in</div>
</AnimatedSection>
```

**Available Animations:**
- `fade-up` - Fades in from bottom
- `fade-in` - Simple fade in
- `fade-down` - Fades in from top
- `slide-left` - Slides from left
- `slide-right` - Slides from right
- `scale-in` - Scales from small to normal
- `bounce-in` - Bounces in

### Staggered Animations

```jsx
import { useStaggeredAnimation } from '@/hooks/useScrollAnimation';

function ProductGrid() {
  const { ref, visibleItems } = useStaggeredAnimation(6, 100);

  return (
    <div ref={ref} className="grid grid-cols-3 gap-4">
      {products.map((product, index) => (
        <div
          key={product.id}
          className={`transition-all duration-600 ${
            visibleItems.includes(index)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          {product.name}
        </div>
      ))}
    </div>
  );
}
```

### Parallax Effect

```jsx
import { useParallax } from '@/hooks/useScrollAnimation';

function HeroSection() {
  const { ref, offset } = useParallax(0.5);

  return (
    <div
      ref={ref}
      style={{ transform: `translateY(${offset}px)` }}
    >
      Parallax background
    </div>
  );
}
```

---

## 🎨 Hover Effects

### Lift Effect

```jsx
<div className="hover-lift">
  Lifts on hover
</div>
```

**Effect:** Translates up 5px with enhanced shadow

### Scale Effect

```jsx
<div className="hover-scale">
  Scales on hover
</div>
```

**Effect:** Scales to 1.05 with bounce easing

### Glow Effects

```jsx
// Cyan glow
<div className="hover-glow-cyan">
  Cyan glow on hover
</div>

// Teal glow
<div className="hover-glow-teal">
  Teal glow on hover
</div>
```

**Effect:** Glowing shadow matching brand colors

---

## 🌈 Color Utilities

### Using Brand Colors

```jsx
import { COLORS } from '@/constants/theme';

// Primary (Cyan)
<div className={COLORS.primary.bg}>Background</div>
<div className={COLORS.primary.text}>Text</div>
<div className={COLORS.primary.gradient}>Gradient</div>

// Secondary (Teal)
<div className={COLORS.secondary.bg}>Background</div>
<div className={COLORS.secondary.gradient}>Gradient</div>

// With hover effects
<div className={`${COLORS.primary.bg} ${COLORS.primary.bgHover}`}>
  Hover to change color
</div>
```

### Gradient Backgrounds

```jsx
// Cyan to Teal
<div className="gradient-cyan-teal">
  Beautiful gradient
</div>

// Teal to Dark
<div className="gradient-teal-dark">
  Dark gradient
</div>

// Cyan to White
<div className="gradient-cyan-white">
  Light gradient
</div>

// Animated gradient background
<div className="gradient-bg-animate">
  Animated gradient
</div>
```

---

## 📦 Component Examples

### Animated Product Card

```jsx
function ProductCard({ product }) {
  return (
    <AnimatedSection animation="fade-up" delay={100}>
      <div className={CARDS.product}>
        <div className="img-zoom">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        </div>
        <div className="p-4">
          <h3 className={TYPOGRAPHY.h4}>{product.name}</h3>
          <p className="text-primary-500 font-bold mt-2">
            ${product.price}
          </p>
          <button className={`${BUTTONS.primary} w-full mt-4`}>
            Add to Cart
          </button>
        </div>
      </div>
    </AnimatedSection>
  );
}
```

### Animated Hero Section

```jsx
function HeroSection() {
  const { ref, offset } = useParallax(0.3);

  return (
    <div className="relative h-screen overflow-hidden">
      <div
        ref={ref}
        style={{ transform: `translateY(${offset}px)` }}
        className="absolute inset-0 bg-gradient-to-br from-primary-100 via-white to-secondary-100"
      />
      <div className="relative z-10 container mx-auto px-6 h-full flex items-center">
        <div className="animate-fade-in-up">
          <h1 className={`${TYPOGRAPHY.hero} text-gradient-animate mb-6`}>
            Welcome to V-Tech
          </h1>
          <p className={`${TYPOGRAPHY.lead} mb-8`}>
            Discover amazing products
          </p>
          <button className={BUTTONS.primary}>
            Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Animated Feature Grid

```jsx
function Features() {
  const { ref, visibleItems } = useStaggeredAnimation(3, 150);

  const features = [
    { icon: '🚀', title: 'Fast Shipping', text: '2-day delivery' },
    { icon: '💳', title: 'Secure Payment', text: 'SSL encrypted' },
    { icon: '🎁', title: 'Gift Wrapping', text: 'Free service' },
  ];

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <div
          key={index}
          className={`${CARDS.hover} transition-all duration-600 ${
            visibleItems.includes(index)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-4xl mb-4 animate-float">{feature.icon}</div>
          <h3 className={TYPOGRAPHY.h3}>{feature.title}</h3>
          <p className="text-neutral-600 mt-2">{feature.text}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚡ Performance Tips

### 1. Use will-change for Animated Elements

```jsx
<div className="will-change-transform hover-lift">
  Optimized animation
</div>
```

### 2. GPU Acceleration

```jsx
<div className="gpu-accelerated animate-slide-in-up">
  Hardware accelerated
</div>
```

### 3. Reduce Motion for Accessibility

The system automatically respects user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animations become instant */
}
```

### 4. Lazy Load Animations

Only animate elements in viewport using `AnimatedSection`:

```jsx
<AnimatedSection animation="fade-up" triggerOnce={true}>
  {/* Animates only once when visible */}
</AnimatedSection>
```

---

## 🎯 Best Practices

### 1. **Consistent Animation Timing**
- Fast interactions: 200ms
- Standard transitions: 300ms
- Complex animations: 400-600ms

### 2. **Ease Functions**
- Default: `ease` (cubic-bezier)
- Bounce: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`
- Smooth: `cubic-bezier(0.4, 0, 0.2, 1)`

### 3. **Animation Hierarchy**
- Hero elements: Immediate (no delay)
- Primary content: 100-200ms delay
- Secondary content: 200-400ms delay
- Background elements: 400ms+ delay

### 4. **Mobile Considerations**
- Reduce animation complexity on mobile
- Use shorter durations (200-300ms max)
- Avoid parallax on touch devices

### 5. **Loading States**
- Use skeleton loaders
- Pulse animations for loading
- Smooth transitions between states

---

## 📱 Responsive Animations

### Disable on Mobile

```jsx
<div className="md:animate-fade-in-up">
  Desktop only animation
</div>
```

### Different Animations per Breakpoint

```jsx
<div className="animate-fade-in md:animate-slide-in-left lg:animate-bounce-in">
  Responsive animation
</div>
```

---

## 🔧 Customization

### Create Custom Animations

```css
/* Add to animations.css */
@keyframes customSlide {
  from {
    transform: translateX(-100%) rotate(-45deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0deg);
    opacity: 1;
  }
}

.custom-animation {
  animation: customSlide 0.6s ease-out;
}
```

### Extend Theme

```js
// In theme.js
export const CUSTOM_ANIMATIONS = {
  myAnimation: 'custom-animation',
};
```

---

## 🎨 Complete Component Template

```jsx
import { BUTTONS, CARDS, TYPOGRAPHY, COLORS, ANIMATIONS } from '@/constants/theme';
import AnimatedSection from '@/components/common/AnimatedSection';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

function ModernProductCard({ product }) {
  return (
    <AnimatedSection animation="fade-up" delay={100}>
      <div className={`${CARDS.product} group`}>
        {/* Image with zoom effect */}
        <div className="img-zoom overflow-hidden rounded-t-lg">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-64 object-cover transform transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        {/* Badge */}
        {product.isNew && (
          <div className="absolute top-4 right-4">
            <span className="badge bg-gradient-to-r from-primary-300 to-primary-500 text-white animate-pulse-slow">
              New
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <h3 className={`${TYPOGRAPHY.h4} ${COLORS.text.heading} mb-2`}>
            {product.name}
          </h3>

          <p className={`${TYPOGRAPHY.bodySmall} ${COLORS.text.body} mb-4`}>
            {product.description}
          </p>

          {/* Price */}
          <div className="flex items-center justify-between mb-4">
            <span className={`${TYPOGRAPHY.h3} ${COLORS.primary.text}`}>
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-neutral-400 line-through text-sm">
                ${product.originalPrice}
              </span>
            )}
          </div>

          {/* Button */}
          <button className={`${BUTTONS.primary} w-full`}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add to Cart
            </span>
          </button>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default ModernProductCard;
```

---

## 📊 Animation Performance Checklist

- [ ] Use `will-change` for frequently animated properties
- [ ] Animate `transform` and `opacity` (GPU accelerated)
- [ ] Avoid animating `width`, `height`, `top`, `left` (causes reflow)
- [ ] Use `AnimatedSection` for scroll animations
- [ ] Respect `prefers-reduced-motion`
- [ ] Test on mobile devices
- [ ] Keep animations under 600ms
- [ ] Use staggered delays for lists (100-200ms per item)
- [ ] Implement loading skeletons
- [ ] Test with slow network speeds

---

## 🎓 Learning Resources

### Animation Timing Functions
- [Easing Functions Cheat Sheet](https://easings.net/)
- [Cubic Bezier Generator](https://cubic-bezier.com/)

### CSS Animations
- [MDN Animation Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

### Performance
- [CSS Triggers](https://csstriggers.com/)
- [High Performance Animations](https://web.dev/animations-guide/)

---

**Status:** ✅ Complete Animation System Ready
**Last Updated:** November 19, 2025
**Version:** 1.0.0

*Designed for the best e-commerce experience using your brand colors!* 🎨
