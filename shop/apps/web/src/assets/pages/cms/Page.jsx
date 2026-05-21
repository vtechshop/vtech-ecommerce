// FILE: apps/web/src/pages/cms/Page.jsx
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { updateMetaTags } from '@/utils/seo';

const Page = () => {
  const { slug } = useParams();

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => {
      const response = await api.get(`/cms/pages/${slug}`);
      return response.data.data;
    },
  });

  useEffect(() => {
    if (page) {
      updateMetaTags({
        title: `${page.title} - VTech`,
        description: page.excerpt || page.content?.substring(0, 160),
        canonical: `https://www.vtechkitchen.com/page/${slug}`,
      });
    }
  }, [page, slug]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Page not found</h1>
        <Link to="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[50px] pb-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
        <div className="prose prose-lg max-w-none overflow-hidden break-words [word-break:break-word]">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || '') }} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default Page;