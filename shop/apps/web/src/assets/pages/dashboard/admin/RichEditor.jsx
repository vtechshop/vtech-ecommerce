// Admin blog editor: headings, lists, links, images (upload / paste / drop) with captions, YouTube videos.
import { useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import toast from 'react-hot-toast';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Unlink, ImagePlus,
  Youtube as YoutubeIcon, Undo2, Redo2, Minus, AlignLeft, AlignCenter, Loader2,
} from 'lucide-react';
import { uploadToServer } from './GuideFields';

const MAX_IMAGE_MB = 10;

function ToolButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 transition ${active ? 'bg-primary-100 text-primary-800' : 'text-gray-700 hover:bg-gray-100'} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ value, onChange, placeholder = 'Write your article here… (paste or drop images too)' }) {
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(0);
  const editorRef = useRef(null);

  const uploadImages = async (files, editorInstance, pos) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const file of images) {
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_IMAGE_MB} MB`);
        continue;
      }
      setUploading(n => n + 1);
      try {
        const media = await uploadToServer(file, 'blog');
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const chain = editorInstance.chain().focus();
        (typeof pos === 'number' ? chain.insertContentAt(pos, { type: 'image', attrs: { src: media.url, alt } }) : chain.setImage({ src: media.url, alt })).run();
      } catch (err) {
        toast.error(err.response?.data?.error?.message || `Could not upload ${file.name}`);
      } finally {
        setUploading(n => n - 1);
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['https', 'mailto', 'tel'] }),
      Youtube.configure({ nocookie: true, modestBranding: true }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'blog-content min-h-[320px] px-4 py-3 focus:outline-none' },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files?.length && Array.from(files).some(f => f.type.startsWith('image/'))) {
          uploadImages(files, editorRef.current);
          return true;
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        const files = event.dataTransfer?.files;
        if (!moved && files?.length && Array.from(files).some(f => f.type.startsWith('image/'))) {
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          uploadImages(files, editorRef.current, pos);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });
  editorRef.current = editor;

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href || 'https://';
    const url = window.prompt('Link address (https://…)', previous);
    if (url === null) return;
    if (!url.trim() || url.trim() === 'https://') { editor.chain().focus().unsetLink().run(); return; }
    if (!/^(https:\/\/|mailto:|tel:|\/)/i.test(url.trim())) { toast.error('Link must start with https://'); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const addYoutube = () => {
    const url = window.prompt('YouTube video link');
    if (!url) return;
    if (!/youtu\.?be/.test(url)) { toast.error('Please paste a YouTube link'); return; }
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
  };

  const image = editor.isActive('image') ? editor.getAttributes('image') : null;
  const setImageAttr = (key, val) => editor.chain().updateAttributes('image', { [key]: val }).run();

  return (
    <div className="rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-gray-200 bg-gray-50 p-1.5">
        <ToolButton label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Sub heading" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-300" aria-hidden="true" />
        <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton label="Highlight box" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton label="Divider line" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
        <ToolButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton label="Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-gray-300" aria-hidden="true" />
        <ToolButton label="Add link" active={editor.isActive('link')} onClick={setLink}><Link2 className="h-4 w-4" /></ToolButton>
        {editor.isActive('link') && <ToolButton label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-4 w-4" /></ToolButton>}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInput.current?.click()}
          className="ml-1 inline-flex items-center gap-1.5 rounded bg-primary-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Image
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addYoutube}
          className="inline-flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          <YoutubeIcon className="h-4 w-4" /> Video
        </button>
        <span className="ml-auto flex">
          <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
          <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => { uploadImages(e.target.files, editor); e.target.value = ''; }}
        />
      </div>

      {image && (
        <div className="grid gap-2 border-b border-blue-100 bg-blue-50 p-2 sm:grid-cols-2">
          <input
            value={image.title || ''}
            onChange={(e) => setImageAttr('title', e.target.value)}
            placeholder="Caption under the image (optional)"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            value={image.alt || ''}
            onChange={(e) => setImageAttr('alt', e.target.value)}
            placeholder="What is in the image (for Google)"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      )}

      {uploading > 0 && <p className="border-b border-gray-100 px-4 py-1 text-xs text-primary-700">Uploading {uploading} image{uploading > 1 ? 's' : ''}…</p>}
      <EditorContent editor={editor} />
    </div>
  );
}
