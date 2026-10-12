import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, X } from 'lucide-react';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const makeKey = () => Math.random().toString(36).slice(2);

/**
 * Controlled image picker with previews.
 * value: [{ key, url, file? }]  (items without `file` are already-uploaded images)
 */
export default function ImageUploader({ value, onChange, max = 6, maxSizeMb = 5, error, label, hint }) {
  const inputRef = useRef(null);
  const replaceIndex = useRef(null);
  const [localError, setLocalError] = useState('');

  const check = (f) => {
    if (!ACCEPT.includes(f.type)) return `"${f.name}" is not allowed. Use JPG, PNG or WEBP.`;
    if (f.size > maxSizeMb * 1024 * 1024) return `"${f.name}" is larger than ${maxSizeMb}MB.`;
    return null;
  };
  const make = (f) => ({ key: makeKey(), file: f, url: URL.createObjectURL(f) });

  const handleFiles = (list) => {
    const files = [...list];
    const next = [...value];
    let errMsg = '';
    let idx = replaceIndex.current;
    replaceIndex.current = null;
    if (idx === null && max === 1 && next.length === 1) idx = 0;

    if (idx !== null) {
      const f = files[0];
      const e = f && check(f);
      if (e) errMsg = e;
      else if (f) { if (next[idx]?.file) URL.revokeObjectURL(next[idx].url); next[idx] = make(f); }
    } else {
      for (const f of files) {
        if (next.length >= max) { errMsg = `You can upload up to ${max} image${max > 1 ? 's' : ''}.`; break; }
        const e = check(f);
        if (e) { errMsg = e; continue; }
        next.push(make(f));
      }
    }
    setLocalError(errMsg);
    onChange(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (i) => {
    if (value[i]?.file) URL.revokeObjectURL(value[i].url);
    onChange(value.filter((_, idx) => idx !== i));
  };
  const replace = (i) => { replaceIndex.current = i; inputRef.current?.click(); };

  const shownError = error || localError;
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {value.map((img, i) => (
          <div key={img.key} className="group relative aspect-square overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
            <img src={img.url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
            {max > 1 && i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink-900/60 p-1">
              <button type="button" onClick={() => replace(i)} className="rounded p-1 text-white hover:bg-white/20" aria-label="Replace image" title="Replace"><RefreshCw size={14} /></button>
              <button type="button" onClick={() => remove(i)} className="rounded p-1 text-white hover:bg-red-600" aria-label="Remove image" title="Remove"><X size={14} /></button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-200 text-ink-500 hover:border-brand-500 hover:text-brand-700">
            <ImagePlus size={22} />
            <span className="text-xs font-semibold">Add</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple={max > 1 && replaceIndex.current === null} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <p className="mt-1.5 text-xs text-ink-500">{hint || `JPG, PNG or WEBP, up to ${maxSizeMb}MB each${max > 1 ? `, max ${max} images` : ''}.`}</p>
      {shownError && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{shownError}</p>}
    </div>
  );
}
