// Admin form for a Free Guide (blog type "guide"): the PDF, and every text on its landing page.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, FileText } from 'lucide-react';
import api from '@/utils/api';

export const EMPTY_GUIDE = {
  kicker: '', headline: '', subheadline: '', hook: '', chips: [],
  pdfUrl: '', pdfName: '', pdfPages: '',
  ctaText: '', ctaNote: '',
  questionsTitle: '', questionsIntro: '', questions: [],
  stepsTitle: '', steps: [],
  stats: [],
  audienceTitle: '', audience: [],
  finalTitle: '', finalText: '', finalCtaText: '',
  whatsappText: '', sourceNote: '',
};

export const guideFromPost = (guide) => ({ ...EMPTY_GUIDE, ...(guide || {}), pdfPages: guide?.pdfPages ?? '' });

/** Drop empty rows and turn pdfPages into a number before saving. */
export const cleanGuide = (g) => {
  const hasText = (row) => (typeof row === 'string' ? row.trim() : Object.values(row).some(v => String(v ?? '').trim()));
  return {
    ...g,
    chips: g.chips.filter(hasText),
    questions: g.questions.filter(hasText),
    steps: g.steps.filter(hasText),
    stats: g.stats.filter(hasText),
    audience: g.audience.filter(hasText),
    pdfPages: g.pdfPages === '' ? undefined : Number(g.pdfPages) || 0,
  };
};

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500';

export async function uploadToServer(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.data;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function Text({ label, hint, value, onChange, rows, placeholder }) {
  return (
    <Field label={label} hint={hint}>
      {rows ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      )}
    </Field>
  );
}

/** Editable list of rows; each row is a string or an object with the given columns. */
function ListEditor({ label, hint, rows, onChange, columns, addLabel }) {
  const isText = !columns;
  const blank = isText ? '' : Object.fromEntries(columns.map(c => [c.key, '']));
  const update = (i, value) => onChange(rows.map((r, j) => (j === i ? value : r)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">{label}</legend>
      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 w-5 flex-shrink-0 text-right text-xs font-semibold text-gray-400">{i + 1}</span>
            <div className={`grid flex-1 gap-2 ${isText ? '' : 'sm:grid-cols-12'}`}>
              {isText ? (
                <input value={row} onChange={e => update(i, e.target.value)} className={inputCls} />
              ) : columns.map(c => (
                <div key={c.key} className={c.span}>
                  {c.rows ? (
                    <textarea rows={c.rows} value={row[c.key] ?? ''} placeholder={c.placeholder} aria-label={c.placeholder}
                      onChange={e => update(i, { ...row, [c.key]: e.target.value })} className={inputCls} />
                  ) : (
                    <input value={row[c.key] ?? ''} placeholder={c.placeholder} aria-label={c.placeholder}
                      onChange={e => update(i, { ...row, [c.key]: e.target.value })} className={inputCls} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-shrink-0 flex-col gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...rows, blank])} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900">
        <Plus className="h-4 w-4" /> {addLabel || 'Add'}
      </button>
    </fieldset>
  );
}

export default function GuideFields({ guide, onChange }) {
  const [uploading, setUploading] = useState(false);
  const set = (key) => (value) => onChange({ ...guide, [key]: value });

  const uploadPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please choose a PDF file'); return; }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`This PDF is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB - please compress it first.`);
      return;
    }
    setUploading(true);
    try {
      const media = await uploadToServer(file, 'guides');
      onChange({ ...guide, pdfUrl: media.url, pdfName: guide.pdfName || file.name.replace(/\.pdf$/i, '') });
      toast.success('PDF uploaded');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'PDF upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PDF */}
      <section className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><FileText className="h-5 w-5 text-amber-600" /> PDF file</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-300 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : guide.pdfUrl ? 'Replace PDF' : 'Upload PDF'}
            <input type="file" accept="application/pdf" className="sr-only" onChange={uploadPdf} disabled={uploading} />
          </label>
          {guide.pdfUrl ? (
            <a href={guide.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline">
              Open uploaded PDF <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-sm text-gray-600">Max 10 MB. Customers download this file.</span>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Text label="PDF name (shown as the file name)" value={guide.pdfName} onChange={set('pdfName')} placeholder="MSME Export Guide - Tamil" />
          <Field label="Pages">
            <input type="number" min="0" value={guide.pdfPages} onChange={e => set('pdfPages')(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Hero */}
      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Top of the page</h3>
        <Text label="Small label above the headline" value={guide.kicker} onChange={set('kicker')} placeholder="இந்திய MSME-களுக்கான இலவச தமிழ் கையேடு" />
        <Text label="Headline (big hook)" value={guide.headline} onChange={set('headline')} rows={2} />
        <Text label="Short explanation" value={guide.subheadline} onChange={set('subheadline')} rows={3} />
        <Text label="Hook line (orange, bold)" value={guide.hook} onChange={set('hook')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Download button text" value={guide.ctaText} onChange={set('ctaText')} placeholder="இலவசமாக Download பண்ணுங்க" />
          <Text label="Small note under the button" value={guide.ctaNote} onChange={set('ctaNote')} placeholder="PDF · 20 பக்கம் · Login தேவையில்லை" />
        </div>
        <ListEditor label="Tick chips (short points)" rows={guide.chips} onChange={set('chips')} addLabel="Add chip" />
      </section>

      <ListEditor
        label="Numbers strip"
        hint="Big number + one line. Leave empty to hide."
        rows={guide.stats}
        onChange={set('stats')}
        addLabel="Add number"
        columns={[
          { key: 'value', placeholder: 'Number, e.g. $2 Trillion', span: 'sm:col-span-4' },
          { key: 'label', placeholder: 'What it means', span: 'sm:col-span-8' },
        ]}
      />

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Questions the PDF answers</h3>
        <Text label="Section title" value={guide.questionsTitle} onChange={set('questionsTitle')} />
        <Text label="Section intro" value={guide.questionsIntro} onChange={set('questionsIntro')} rows={2} />
        <ListEditor
          label="Question cards"
          rows={guide.questions}
          onChange={set('questions')}
          addLabel="Add card"
          columns={[
            { key: 'icon', placeholder: 'Emoji', span: 'sm:col-span-2' },
            { key: 'title', placeholder: 'Question / title', span: 'sm:col-span-8' },
            { key: 'page', placeholder: 'PDF page', span: 'sm:col-span-2' },
            { key: 'desc', placeholder: 'Short answer teaser', span: 'sm:col-span-12', rows: 2 },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Steps</h3>
        <Text label="Section title" value={guide.stepsTitle} onChange={set('stepsTitle')} />
        <ListEditor
          label="Steps (in order)"
          rows={guide.steps}
          onChange={set('steps')}
          addLabel="Add step"
          columns={[
            { key: 'title', placeholder: 'Step title', span: 'sm:col-span-4' },
            { key: 'desc', placeholder: 'One line', span: 'sm:col-span-8' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Who it is for</h3>
        <Text label="Section title" value={guide.audienceTitle} onChange={set('audienceTitle')} />
        <ListEditor label="Points" rows={guide.audience} onChange={set('audience')} addLabel="Add point" />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-gray-900">Bottom of the page</h3>
        <Text label="Final title" value={guide.finalTitle} onChange={set('finalTitle')} />
        <Text label="Final text" value={guide.finalText} onChange={set('finalText')} rows={2} />
        <Text label="Final button text (empty = same as top button)" value={guide.finalCtaText} onChange={set('finalCtaText')} />
        <Text label="WhatsApp message customers send" value={guide.whatsappText} onChange={set('whatsappText')} rows={2} hint="Empty = the page title and link." />
        <Text label="Source / credit note (small text at the very bottom)" value={guide.sourceNote} onChange={set('sourceNote')} rows={3} />
      </section>
    </div>
  );
}
