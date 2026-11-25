// Free Guide landing page: a hook, what the PDF answers, and a big download button.
// Every text on it comes from the admin (Blog → Free Guide), in the guide's own language.
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, MessageCircle, FileText, CheckCircle2, BookOpen } from 'lucide-react';
import SEO from '@/components/common/SEO';
import api from '@/utils/api';
import { languageLabel, guideWords } from '@/utils/blogLanguages';
import { PLACEHOLDER_IMAGE_MD, handleImageError } from '@/utils/placeholders';

const SITE = 'https://www.vtechkitchen.com';
const WHATSAPP_NUMBER = '919944556683';

const filled = (list) => (Array.isArray(list) ? list : []).filter(item =>
  typeof item === 'string' ? item.trim() : Object.values(item || {}).some(v => String(v ?? '').trim()));

function DownloadButton({ guide, slug, label, className = '' }) {
  if (!guide.pdfUrl) {
    return (
      <span className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gray-200 px-6 py-4 font-bold text-gray-500 ${className}`}>
        <FileText className="h-5 w-5" aria-hidden="true" /> PDF
      </span>
    );
  }
  // Count the download in the background; the link itself always opens the PDF
  const count = () => { api.post(`/blog/${slug}/download`).catch(() => {}); };
  return (
    <a
      href={guide.pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={guide.pdfName || true}
      onClick={count}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-4 text-base font-extrabold text-gray-900 shadow-lg shadow-amber-400/30 transition hover:-translate-y-0.5 hover:bg-amber-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:text-lg ${className}`}
    >
      <Download className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

export default function GuideLanding({ post }) {
  const guide = post.guide || {};
  const lang = post.language || 'en';
  const words = guideWords(lang);
  const ctaText = guide.ctaText || 'Download PDF';
  const translations = (post.translations || []).filter(t => t.slug);
  const questions = filled(guide.questions);
  const steps = filled(guide.steps);
  const stats = filled(guide.stats);
  const audience = filled(guide.audience);
  const chips = filled(guide.chips);
  const pageUrl = `${SITE}/blog/${post.slug}`;
  const waText = guide.whatsappText || `${post.title} - ${pageUrl}`;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  return (
    <div lang={lang} className="min-h-screen bg-white pb-24 text-gray-800 md:pb-0">
      <SEO
        title={post.metaTitle || `${post.title} | VTech Kitchen`}
        description={post.metaDescription || post.excerpt || guide.subheadline || post.title}
        image={post.featuredImage}
        type="article"
        url={pageUrl}
      />
      <Helmet>
        {translations.map(t => (
          <link key={t.slug} rel="alternate" hrefLang={t.language} href={`${SITE}/blog/${t.slug}`} />
        ))}
      </Helmet>

      {/* Top bar: back + other languages */}
      <div className="border-b border-gray-100 bg-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {words.back}
          </Link>
          {translations.length > 1 && (
            <nav aria-label={words.readIn} className="flex flex-wrap items-center gap-1.5">
              {translations.map(t => (
                <Link
                  key={t.slug}
                  to={`/blog/${t.slug}`}
                  aria-current={t.slug === post.slug ? 'page' : undefined}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                    t.slug === post.slug ? 'bg-primary-700 text-white' : 'bg-primary-50 text-primary-800 hover:bg-primary-100'
                  }`}
                >
                  {languageLabel(t.language)}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Hero */}
      <header className="bg-gradient-to-br from-primary-50 via-white to-amber-50">
        <div className="container mx-auto grid items-center gap-10 px-4 py-10 md:grid-cols-[1.25fr_0.75fr] md:py-16">
          <div className="min-w-0">
            {guide.kicker && (
              <span className="inline-block rounded-full bg-primary-100 px-4 py-1.5 text-sm font-bold text-primary-800">{guide.kicker}</span>
            )}
            <h1 className="mt-5 text-3xl font-extrabold leading-snug text-primary-900 [text-wrap:balance] max-sm:text-2xl sm:text-4xl lg:text-5xl lg:leading-tight">
              {guide.headline || post.title}
            </h1>
            {guide.subheadline && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">{guide.subheadline}</p>}
            {guide.hook && <p className="mt-5 text-xl font-extrabold leading-snug text-amber-700">{guide.hook}</p>}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <DownloadButton guide={guide} slug={post.slug} label={ctaText} />
            </div>
            {guide.ctaNote && <p className="mt-3 text-sm text-gray-500">{guide.ctaNote}</p>}
            {chips.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {chips.map(chip => (
                  <li key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-white px-3 py-1 text-sm font-medium text-primary-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" /> {chip}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {post.featuredImage && (
            <div className="mx-auto w-full max-w-xs md:max-w-sm">
              <img
                src={post.featuredImage}
                alt={guide.pdfName || post.title}
                className="w-full rotate-1 rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-primary-900/15 motion-reduce:rotate-0"
                onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_MD)}
              />
              {guide.pdfPages > 0 && (
                <p className="mt-4 text-center text-sm font-semibold text-gray-600">
                  PDF · {guide.pdfPages} {words.page} · {words.free}
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Numbers */}
      {stats.length > 0 && (
        <section className="bg-primary-900 text-white">
          <div className={`container mx-auto grid gap-6 px-4 py-8 sm:grid-cols-2 ${stats.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
            {stats.map((s, i) => (
              <div key={i} className="text-center sm:text-left">
                <div className="text-3xl font-extrabold tabular-nums text-amber-300">{s.value}</div>
                <div className="mt-1 text-sm leading-relaxed text-primary-100">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What the guide answers */}
      {questions.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            {guide.questionsTitle && <h2 className="text-2xl font-extrabold leading-snug text-primary-900 [text-wrap:balance] sm:text-3xl">{guide.questionsTitle}</h2>}
            {guide.questionsIntro && <p className="mt-3 text-gray-600">{guide.questionsIntro}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((q, i) => (
              <article key={i} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl" aria-hidden="true">{q.icon || '📘'}</span>
                  {q.page && (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> {words.page} {q.page}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-bold leading-snug text-primary-900">{q.title}</h3>
                {q.desc && <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{q.desc}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <section className="bg-gray-50">
          <div className="container mx-auto px-4 py-14">
            {guide.stepsTitle && <h2 className="mx-auto mb-10 max-w-3xl text-center text-2xl font-extrabold leading-snug text-primary-900 [text-wrap:balance] sm:text-3xl">{guide.stepsTitle}</h2>}
            <ol className={`grid gap-4 sm:grid-cols-2 ${steps.length >= 5 ? 'lg:grid-cols-5' : steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {steps.map((s, i) => (
                <li key={i} className="rounded-2xl bg-white p-5 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="mt-3 font-bold leading-snug text-primary-900">{s.title}</h3>
                  {s.desc && <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.desc}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Who it is for */}
      {audience.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <div className="mx-auto max-w-3xl">
            {guide.audienceTitle && <h2 className="mb-6 text-center text-2xl font-extrabold leading-snug text-primary-900 [text-wrap:balance] sm:text-3xl">{guide.audienceTitle}</h2>}
            <ul className="grid gap-3">
              {audience.map((a, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Final call to action */}
      <section className="bg-primary-900 px-4 py-14 text-center text-white">
        <div className="mx-auto max-w-3xl">
          {guide.finalTitle && <h2 className="text-2xl font-extrabold leading-snug [text-wrap:balance] sm:text-3xl">{guide.finalTitle}</h2>}
          {guide.finalText && <p className="mt-4 leading-relaxed text-primary-100">{guide.finalText}</p>}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <DownloadButton guide={guide} slug={post.slug} label={guide.finalCtaText || ctaText} />
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-4 font-semibold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> {words.whatsapp}
            </a>
          </div>
        </div>
      </section>

      {guide.sourceNote && (
        <p className="container mx-auto whitespace-pre-line px-4 py-6 text-center text-xs leading-relaxed text-gray-500">{guide.sourceNote}</p>
      )}

      {/* Mobile: download button always in reach */}
      {guide.pdfUrl && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
          <DownloadButton guide={guide} slug={post.slug} label={ctaText} className="w-full !py-3" />
        </div>
      )}
    </div>
  );
}
