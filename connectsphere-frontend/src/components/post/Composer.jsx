import { useRef, useState } from 'react';
import { ImagePlus, X, Sparkles, Globe, Users, Loader2 } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import Button from '../ui/Button.jsx';

const TONES = ['casual', 'professional', 'viral', 'witty', 'inspirational'];
const MAX = 5000;

export default function Composer({ onCreated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [posting, setPosting] = useState(false);

  // AI assist
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('casual');
  const [aiLoading, setAiLoading] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [hashtags, setHashtags] = useState([]);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 4 - files.length);
    if (!picked.length) return;
    setFiles((f) => [...f, ...picked]);
    setPreviews((p) => [...p, ...picked.map((file) => URL.createObjectURL(file))]);
    e.target.value = '';
  };

  const removeFile = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const generate = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setCaptions([]);
    setHashtags([]);
    try {
      const { data } = await api.post('/ai/caption', {
        topic: aiTopic.trim(),
        tone: aiTone,
        count: 3,
      });
      setCaptions(data.data.captions || []);
      setHashtags(data.data.hashtags || []);
    } catch (err) {
      const msg =
        err?.response?.status === 503
          ? "AI isn't configured on the server yet — add an API key to enable it."
          : apiError(err);
      toast(msg, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const appendHashtag = (tag) =>
    setContent((c) => (c.includes(`#${tag}`) ? c : `${c} #${tag}`.trim()));

  const reset = () => {
    setContent('');
    previews.forEach(URL.revokeObjectURL);
    setFiles([]);
    setPreviews([]);
    setAiOpen(false);
    setCaptions([]);
    setHashtags([]);
    setAiTopic('');
  };

  const canPost = (content.trim() || files.length) && !posting;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('content', content.trim());
      fd.append('visibility', visibility);
      files.forEach((f) => fd.append('images', f));
      const { data } = await api.post('/posts', fd);
      onCreated?.(data.data.post);
      reset();
      toast('Posted', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border-b border-slate-100 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950 sm:rounded-2xl sm:border sm:shadow-card sm:dark:border-slate-800">
      <div className="flex gap-3">
        <Avatar src={user?.avatar} name={user?.name} size="md" />
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX))}
            rows={2}
            placeholder="What are you building today?"
            className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-ink placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
          />

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {previews.map((src, i) => (
                <div key={src} className="group relative aspect-square overflow-hidden rounded-xl">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/60 text-white transition hover:bg-ink"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {aiOpen && (
            <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
                <Sparkles size={15} /> AI caption assist
              </div>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generate()}
                  placeholder="What's the post about?"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                />
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm capitalize focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Button size="md" onClick={generate} loading={aiLoading} disabled={!aiTopic.trim()}>
                  Generate
                </Button>
              </div>

              {captions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {captions.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setContent(c)}
                      className="block w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:ring-1 hover:ring-brand-300 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {hashtags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {hashtags.map((t) => (
                    <button
                      key={t}
                      onClick={() => appendHashtag(t)}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:bg-slate-900 dark:text-brand-300 dark:ring-brand-900/50"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={files.length >= 4}
                aria-label="Add image"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-500 transition hover:bg-brand-50 disabled:opacity-40 dark:hover:bg-brand-900/20"
              >
                <ImagePlus size={19} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                className="hidden"
              />
              <button
                onClick={() => setAiOpen((o) => !o)}
                aria-label="AI assist"
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition ${
                  aiOpen
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                }`}
              >
                <Sparkles size={17} /> AI
              </button>
              <button
                onClick={() => setVisibility((v) => (v === 'public' ? 'followers' : 'public'))}
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {visibility === 'public' ? <Globe size={15} /> : <Users size={15} />}
                {visibility === 'public' ? 'Public' : 'Followers'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {content.length > MAX - 500 && (
                <span className="text-xs text-slate-400">{MAX - content.length}</span>
              )}
              <Button onClick={submit} disabled={!canPost}>
                {posting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
