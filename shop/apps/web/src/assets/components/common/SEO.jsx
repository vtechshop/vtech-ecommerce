import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'V-Tech Kitchen - Premium Kitchen Appliances & Utensils',
  description = 'Shop premium kitchen appliances and utensils at V-Tech Kitchen. Discover quality cookware, gadgets, and tools for your modern kitchen. Fast shipping, great prices.',
  keywords = 'kitchen appliances, cookware, kitchen utensils, kitchen gadgets, cooking tools, premium kitchenware',
  image = 'https://www.vtechkitchen.com/og-image.jpg',
  url,
  type = 'website',
  structuredData,
}) => {
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://www.vtechkitchen.com');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="V-Tech Kitchen" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
