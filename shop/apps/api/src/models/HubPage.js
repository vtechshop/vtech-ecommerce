// FILE: apps/api/src/models/HubPage.js
const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema({
  text:    { type: String, trim: true, default: '' },
  url:     { type: String, trim: true, default: '' },
  visible: { type: Boolean, default: true },
}, { _id: false });

const quickActionSchema = new mongoose.Schema({
  label:             { type: String, required: true, trim: true },
  desc:              { type: String, trim: true, default: '' },
  icon:              { type: String, default: 'shopping-bag' },
  href:              { type: String, required: true, trim: true },
  color:             { type: String, default: 'bg-primary-600' },
  displayOrder:      { type: Number, default: 0 },
  newTab:            { type: Boolean, default: false },
  visible:           { type: Boolean, default: true },
  analyticsKey:      { type: String, default: '' },
  ping:              { type: Boolean, default: false },
});

const featureSchema = new mongoose.Schema({
  icon:         { type: String, default: 'star' },
  title:        { type: String, required: true, trim: true },
  desc:         { type: String, trim: true, default: '' },
  displayOrder: { type: Number, default: 0 },
  visible:      { type: Boolean, default: true },
});

const statSchema = new mongoose.Schema({
  label:             { type: String, required: true, trim: true },
  end:               { type: Number, required: true, default: 0 },
  suffix:            { type: String, default: '' },
  prefix:            { type: String, default: '' },
  decimals:          { type: Number, default: 0, min: 0, max: 4 },
  animationEnabled:  { type: Boolean, default: true },
  visible:           { type: Boolean, default: true },
  displayOrder:      { type: Number, default: 0 },
});

const resourceSchema = new mongoose.Schema({
  icon:         { type: String, default: 'link' },
  label:        { type: String, required: true, trim: true },
  desc:         { type: String, trim: true, default: '' },
  href:         { type: String, required: true, trim: true },
  iconClass:    { type: String, default: 'bg-primary-600' },
  visible:      { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  newTab:       { type: Boolean, default: true },
});

const serviceSchema = new mongoose.Schema({
  icon:         { type: String, default: 'arrow-right' },
  label:        { type: String, required: true, trim: true },
  desc:         { type: String, trim: true, default: '' },
  href:         { type: String, required: true, trim: true },
  displayOrder: { type: Number, default: 0 },
  visible:      { type: Boolean, default: true },
});

const socialSchema = new mongoose.Schema({
  platform:     { type: String, trim: true, default: 'custom' },
  label:        { type: String, required: true, trim: true },
  handle:       { type: String, trim: true, default: '' },
  href:         { type: String, required: true, trim: true },
  hoverBg:      { type: String, default: 'group-hover:bg-primary-600' },
  visible:      { type: Boolean, default: true },
  newTab:       { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
});

const versionSchema = new mongoose.Schema({
  data:    { type: mongoose.Schema.Types.Mixed },
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:    { type: String, trim: true, default: '' },
}, { _id: false });

const mediaAssetSchema = new mongoose.Schema({
  url:      { type: String, default: '' },
  mediaId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Media', default: null },
  mimeType: { type: String, default: '' },
}, { _id: false });

const hubPageSchema = new mongoose.Schema({
  hero: {
    visible:       { type: Boolean, default: true },
    headline:      { type: String, default: 'Professional Kitchen Machines' },
    subheading:    { type: String, default: 'Built to Grow Your Business.' },
    eyebrow:       { type: String, default: 'Commercial Kitchen Equipment Manufacturer' },
    trustText:     { type: String, default: 'Trusted by 10,000+ restaurants, hotels & cloud kitchens across India.' },
    badge:         { type: String, default: '' },
    primaryButton:   { type: buttonSchema, default: () => ({ text: 'Shop Products', url: '/products', visible: true }) },
    secondaryButton: { type: buttonSchema, default: () => ({ text: 'WhatsApp Us', url: 'https://wa.me/919944556683?text=Hi%2C%20I%27m%20interested%20in%20VTech%20Kitchen%20products', visible: true }) },
    // Media
    backgroundType: { type: String, enum: ['gradient', 'image', 'video'], default: 'gradient' },
    desktop: {
      image:  { type: mediaAssetSchema, default: () => ({}) },
      video:  { type: mediaAssetSchema, default: () => ({}) },
      poster: { type: mediaAssetSchema, default: () => ({}) },
    },
    mobile: {
      image:  { type: mediaAssetSchema, default: () => ({}) },
      video:  { type: mediaAssetSchema, default: () => ({}) },
      poster: { type: mediaAssetSchema, default: () => ({}) },
    },
    overlay: {
      color:   { type: String, default: '#000000' },
      opacity: { type: Number, default: 0, min: 0, max: 1 },
    },
    videoSettings: {
      autoplay:    { type: Boolean, default: true },
      loop:        { type: Boolean, default: true },
      muted:       { type: Boolean, default: true },
      playsInline: { type: Boolean, default: true },
    },
  },
  quickActions:     { type: [quickActionSchema], default: () => DEFAULT_QUICK_ACTIONS },
  featuredProducts: {
    mode:             { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
    automaticMode:    { type: String, enum: ['featured', 'newest', 'bestsellers', 'highest_rated'], default: 'featured' },
    manualProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    limit:            { type: Number, default: 6, min: 1, max: 20 },
    visible:          { type: Boolean, default: true },
  },
  whyChooseUs: { type: [featureSchema], default: () => DEFAULT_FEATURES },
  stats:       { type: [statSchema],    default: () => DEFAULT_STATS },
  resources:   { type: [resourceSchema], default: () => DEFAULT_RESOURCES },
  services:    { type: [serviceSchema], default: () => DEFAULT_SERVICES },
  socials:     { type: [socialSchema],  default: () => DEFAULT_SOCIALS },
  contact: {
    phone:         { type: String, default: '+91 99445 56683' },
    phoneHref:     { type: String, default: 'tel:+919944556683' },
    whatsapp:      { type: String, default: '+91 99445 56683' },
    whatsappHref:  { type: String, default: 'https://wa.me/919944556683' },
    email:         { type: String, default: 'vtechshop.customercare@gmail.com' },
    emailHref:     { type: String, default: 'mailto:vtechshop.customercare@gmail.com' },
    address:       { type: String, default: 'Ganapathy, Coimbatore, Tamil Nadu' },
    mapsHref:      { type: String, default: 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore' },
    mapsEmbed:     { type: String, default: 'https://maps.google.com/maps?q=Ganapathy+Coimbatore+Tamil+Nadu&t=&z=15&ie=UTF8&iwloc=&output=embed' },
    businessHours: { type: String, default: 'Mon – Sat · 9:00 AM – 6:00 PM IST' },
  },
  seo: {
    title:          { type: String, default: 'Quick Hub — VTech Kitchen | Commercial Kitchen Equipment' },
    description:    { type: String, default: 'Shop commercial kitchen machines, get a quote, book a demo, or contact VTech Kitchen — everything in one place.' },
    keywords:       { type: String, default: 'VTech Kitchen, commercial kitchen equipment, vegetable cutting machine' },
    canonicalUrl:   { type: String, default: 'https://www.vtechkitchen.com/hub' },
    ogImage:        { type: String, default: '' },
    robots:         { type: String, default: 'index, follow' },
    sitemapInclude: { type: Boolean, default: true },
  },
  status:      { type: String, enum: ['draft', 'published'], default: 'published' },
  hasDraft:    { type: Boolean, default: false },
  draft:       { type: mongoose.Schema.Types.Mixed, default: null },
  publishedAt: { type: Date },
  versions:    { type: [versionSchema], default: [] },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Singleton: exactly one document
hubPageSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
    doc.publishedAt = new Date();
    await doc.save();
  }
  return doc;
};

// Default seed data matching current Hub.jsx hardcoded values
const DEFAULT_QUICK_ACTIONS = [
  { label: 'Shop Products', desc: 'Browse all machines', icon: 'shopping-bag', href: '/products', color: 'bg-primary-600', analyticsKey: 'shop_products', displayOrder: 0 },
  { label: 'WhatsApp', desc: 'Chat instantly', icon: 'message-circle', href: 'https://wa.me/919944556683?text=Hi%2C%20I%27m%20interested%20in%20VTech%20Kitchen%20products', color: 'bg-green-500', analyticsKey: 'whatsapp', ping: true, displayOrder: 1 },
  { label: 'Call Us', desc: '+91 99445 56683', icon: 'phone', href: 'tel:+919944556683', color: 'bg-blue-600', analyticsKey: 'call', displayOrder: 2 },
  { label: 'Our Location', desc: 'Ganapathy, Coimbatore', icon: 'map-pin', href: 'https://www.google.com/maps/search/VTech+Kitchen+Ganapathy+Coimbatore', color: 'bg-green-600', analyticsKey: 'maps', newTab: true, displayOrder: 3 },
  { label: 'Email', desc: 'Quick replies guaranteed', icon: 'mail', href: 'mailto:vtechshop.customercare@gmail.com', color: 'bg-blue-500', analyticsKey: 'email', displayOrder: 4 },
  { label: 'Track Order', desc: 'Real-time updates', icon: 'package', href: '/track-order', color: 'bg-orange-500', analyticsKey: 'track_order', displayOrder: 5 },
  { label: 'Warranty', desc: 'Check your coverage', icon: 'shield-check', href: '/warranty-check', color: 'bg-yellow-500', analyticsKey: 'warranty', displayOrder: 6 },
];

const DEFAULT_FEATURES = [
  { icon: 'factory', title: 'Manufacturer Direct', desc: 'We make what we sell — no middlemen, best prices.', displayOrder: 0 },
  { icon: 'shield-check', title: 'ISO Certified Quality', desc: 'Every machine tested before dispatch.', displayOrder: 1 },
  { icon: 'award', title: '10+ Years Experience', desc: 'Serving the industry since 2012.', displayOrder: 2 },
  { icon: 'truck', title: 'Pan-India Delivery', desc: 'Fast shipping to all 28 states.', displayOrder: 3 },
  { icon: 'headphones', title: '24/7 Support', desc: 'WhatsApp, call, or email anytime.', displayOrder: 4 },
  { icon: 'zap', title: 'Custom Fabrication', desc: 'Bespoke solutions for your kitchen.', displayOrder: 5 },
  { icon: 'users', title: '10,000+ Customers', desc: 'Trusted by restaurants, hotels & cloud kitchens.', displayOrder: 6 },
  { icon: 'tag', title: 'Best Price Guarantee', desc: 'Price match on identical spec machines.', displayOrder: 7 },
];

const DEFAULT_STATS = [
  { label: 'Machines Delivered', end: 10000, suffix: '+', displayOrder: 0 },
  { label: 'Business Customers', end: 500, suffix: '+', displayOrder: 1 },
  { label: 'States Covered', end: 28, displayOrder: 2 },
  { label: 'Years in Industry', end: 10, suffix: '+', displayOrder: 3 },
  { label: 'Customer Rating', end: 4.8, decimals: 1, suffix: '★', displayOrder: 4 },
];

const DEFAULT_RESOURCES = [
  { icon: 'youtube', label: 'Video Demos', desc: 'Watch machines in action', href: 'https://www.youtube.com/@makethingsbest', iconClass: 'bg-red-500', newTab: true, displayOrder: 0 },
  { icon: 'file-text', label: 'Product Catalog', desc: 'Download our full PDF catalog', href: '/catalog', iconClass: 'bg-primary-600', displayOrder: 1 },
  { icon: 'headphones', label: 'Live Support', desc: 'Instant answers via WhatsApp', href: 'https://wa.me/919944556683', iconClass: 'bg-green-500', newTab: true, displayOrder: 2 },
  { icon: 'book-open', label: 'User Manuals', desc: 'Installation & maintenance guides', href: '/support', iconClass: 'bg-purple-600', displayOrder: 3 },
];

const DEFAULT_SERVICES = [
  { icon: 'building-2', label: 'Bulk / OEM Orders', desc: 'Custom branding for your restaurant chain', href: 'mailto:vtechshop.customercare@gmail.com', displayOrder: 0 },
  { icon: 'truck', label: 'Demo at Your Location', desc: 'We bring the machine to your kitchen', href: 'https://wa.me/919944556683', displayOrder: 1 },
  { icon: 'file-text', label: 'GST Invoice', desc: 'Proper tax invoices for B2B purchases', href: '/contact', displayOrder: 2 },
  { icon: 'shield', label: 'AMC Packages', desc: 'Annual maintenance contracts', href: 'mailto:vtechshop.customercare@gmail.com', displayOrder: 3 },
  { icon: 'zap', label: 'Installation Support', desc: 'On-site setup by our technicians', href: 'https://wa.me/919944556683', displayOrder: 4 },
];

const DEFAULT_SOCIALS = [
  { platform: 'youtube', label: 'YouTube', handle: '@makethingsbest', href: 'https://www.youtube.com/@makethingsbest', hoverBg: 'group-hover:bg-red-600', newTab: true, displayOrder: 0 },
  { platform: 'instagram', label: 'Instagram', handle: '@vtechkitchen', href: 'https://instagram.com', hoverBg: 'group-hover:bg-pink-600', newTab: true, displayOrder: 1 },
  { platform: 'facebook', label: 'Facebook', handle: 'VTech Kitchen', href: 'https://facebook.com', hoverBg: 'group-hover:bg-blue-700', newTab: true, displayOrder: 2 },
  { platform: 'linkedin', label: 'LinkedIn', handle: 'VTech Kitchen', href: 'https://linkedin.com', hoverBg: 'group-hover:bg-blue-800', newTab: true, displayOrder: 3 },
];

module.exports = mongoose.model('HubPage', hubPageSchema);
