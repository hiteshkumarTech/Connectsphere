import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { api, apiError } from '../../lib/api';
import { uploadReelVideo } from '../../lib/uploadToCloudinary';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

const MAX_MB = 100;

export default function CreateReelModal({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('video/')) return toast('Please choose a video file', 'error');
    if (f.size > MAX_MB * 1024 * 1024) return toast(`Video must be under ${MAX_MB}MB`, 'error');
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
  };

  const reset = () => {
    clearFile();
    setCaption('');
    setProgress(0);
    setBusy(false);
  };

  const close = () => {
    if (busy) return; // don't allow closing mid-upload
    reset();
    onClose?.();
  };

  const publish = async () => {
    if (!file || busy) return;
    setBusy(true);
    setProgress(0);
    try {
      const media = await uploadReelVideo(file, setProgress);
      const { data } = await api.post('/reels', { ...media, caption: caption.trim() });
      toast('Reel published', 'success');
      onCreated?.(data.data.reel);
      reset();
      onClose?.();
    } catch (err) {
      toast(apiError(err, 'Could not publish reel'), 'error');
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Create reel" maxWidth="max-w-md">
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-12 text-slate-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-slate-700"
        >
          <UploadCloud size={34} />
          <div className="text-center">
            <p className="text-sm font-medium">Tap to choose a video</p>
            <p className="text-xs text-slate-400">
              MP4 or MOV · up to {MAX_MB}MB · vertical looks best
            </p>
          </div>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-2xl bg-black">
            <video src={preview} className="h-full w-full object-contain" controls playsInline />
            {!busy && (
              <button
                onClick={clearFile}
                aria-label="Remove video"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-white transition hover:bg-ink"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            rows={2}
            placeholder="Write a caption…  use #hashtags"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />

          {busy && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-slate-400">
                {progress < 100 ? `Uploading… ${progress}%` : 'Finishing up…'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <input ref={fileRef} type="file" accept="video/*" onChange={pick} className="hidden" />
        <Button variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={publish} disabled={!file || busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Publish'}
        </Button>
      </div>
    </Modal>
  );
}
