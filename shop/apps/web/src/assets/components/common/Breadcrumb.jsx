import { Link } from 'react-router-dom';
import { injectJSONLD } from '@/utils/seo';
import { useEffect } from 'react';

const Breadcrumb = ({ items }) => {
  // items: [{ name: 'Home', path: '/' }, { name: 'Cookware', path: '/category/cookware' }, { name: 'Cast Iron Tawa' }]

  useEffect(() => {
    if (!items?.length) return;
    injectJSONLD({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        ...(item.path ? { item: `https://www.vtechkitchen.com${item.path}` } : {}),
      })),
    }, 'breadcrumb');
  }, [items]);

  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.path ? (
              <Link to={item.path} className="hover:text-blue-600 transition-colors">
                {item.name}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium truncate max-w-[200px]">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
