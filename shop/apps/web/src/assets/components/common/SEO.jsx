import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.vtechkitchen.com';

const SEO = ({
  title = 'VTech Kitchen - Premium Kitchen Appliances & Utensils',
  description = 'Shop premium kitchen appliances and utensils at VTech Kitchen. Discover quality cookware, gadgets, and tools for your modern kitchen. Fast shipping, great prices.',
  keywords = 'kitchen appliances, cookware, kitchen utensils, kitchen gadgets, cooking tools, premium kitchenware',
  image = `${BASE_URL}/og-image.jpg`,
  url,
  type = 'website',
  noindex = false,
  structuredData,
}) => {
  // Build canonical URL: strip query params to avoid duplicate content
  let canonicalUrl = url;
  if (!canonicalUrl && typeof window !== 'undefined') {
    canonicalUrl = `${BASE_URL}${window.location.pathname}`;
  }
  canonicalUrl = canonicalUrl || BASE_URL;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots directive */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="VTech Kitchen" />

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

/**
 * NoIndex component - blocks search engine indexing for private pages.
 * Use on: cart, login, register, checkout, dashboards, etc.
 */
export const NoIndex = ({ title }) => (
  <Helmet>
    {title && <title>{title}</title>}
    <meta name="robots" content="noindex, nofollow" />
  </Helmet>
);

export default SEO;
