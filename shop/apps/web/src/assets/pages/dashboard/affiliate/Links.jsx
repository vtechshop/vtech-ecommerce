// FILE: apps/web/src/pages/dashboard/affiliate/Links.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import { Copy, Check } from 'lucide-react';

const Links = () => {
  const [copiedLink, setCopiedLink] = useState(null);

  const { data: linksData } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const response = await api.get('/affiliates/links');
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (links rarely change)
    cacheTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  const handleCopy = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(index);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Affiliate Links</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Affiliate Code</h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-gray-100 px-4 py-3 rounded font-mono text-lg font-bold">
            {linksData?.code}
          </code>
          <Button
            variant="outline"
            onClick={() => handleCopy(linksData?.code, 'code')}
          >
            {copiedLink === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-sm text-gray-700 mt-2">
          Share this code with your audience or use the pre-formatted links below
        </p>
      </div>

      <div className="space-y-4">
        {linksData?.links?.map((link, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg capitalize">{link.type}</h3>
                <p className="text-sm text-gray-700 mt-1">{link.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(link.url, index)}
              >
                {copiedLink === index ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
            <code className="block bg-gray-100 p-3 rounded text-sm overflow-x-auto">
              {link.url}
            </code>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold mb-2">How to use these links:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Share these links on your website, blog, or social media</li>
          <li>When someone clicks your link and makes a purchase, you earn a commission</li>
          <li>Cookie tracking ensures you get credit for up to 30 days</li>
          <li>Replace [slug] with actual product slugs for specific product links</li>
        </ul>
      </div>
    </div>
  );
};

export default Links;