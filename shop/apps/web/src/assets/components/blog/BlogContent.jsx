// Shows a blog article's HTML (from the admin editor) safely: sanitised, YouTube embeds kept,
// and an image's title shown as a caption under it.
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i;

const escapeText = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cleanHtml(html) {
  // Older posts are plain text: keep their line breaks as paragraphs
  if (html && !/<[a-z][\s\S]*>/i.test(html)) {
    html = html.split(/\n{2,}/).map(p => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`).join('');
  }
  const clean = DOMPurify.sanitize(html || '', {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'target', 'rel', 'loading'],
  });
  if (typeof window === 'undefined') return clean;

  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  // Only YouTube iframes, in a responsive 16:9 box
  root.querySelectorAll('iframe').forEach((frame) => {
    if (!YOUTUBE_EMBED.test(frame.getAttribute('src') || '')) { frame.remove(); return; }
    frame.removeAttribute('width');
    frame.removeAttribute('height');
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('allowfullscreen', 'true');
    const box = doc.createElement('div');
    box.className = 'blog-video';
    frame.replaceWith(box);
    box.appendChild(frame);
  });

  // Image title → caption
  root.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy');
    const caption = img.getAttribute('title');
    if (!caption || img.closest('figure')) return;
    const figure = doc.createElement('figure');
    const figcaption = doc.createElement('figcaption');
    figcaption.textContent = caption;
    const target = img.parentElement?.tagName === 'P' && img.parentElement.childNodes.length === 1 ? img.parentElement : img;
    target.replaceWith(figure);
    figure.appendChild(img);
    figure.appendChild(figcaption);
  });

  // Links to other sites open in a new tab
  root.querySelectorAll('a[href^="http"]').forEach((a) => {
    if (!a.getAttribute('href').startsWith(window.location.origin)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return root.innerHTML;
}

export default function BlogContent({ html, className = '' }) {
  const safe = useMemo(() => cleanHtml(html), [html]);
  return <div className={`blog-content ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}
