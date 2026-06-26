import { Sparkles, MessageCircle, Zap, Orbit } from 'lucide-react';
import Brand from '../Brand.jsx';

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'AI that writes captions and cleans up your posts' },
  { icon: MessageCircle, text: 'Real-time chat with typing and read receipts' },
  { icon: Zap, text: 'A feed that reacts the instant you do' },
];

export default function AuthShell({ children }) {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-2">
      {/* Cinematic animated backdrop — spans the whole screen */}
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
        <div className="auth-grid absolute inset-0" />
        <div className="absolute inset-0 bg-slate-950/40" />
        {/* floating glow particles */}
        <span className="float-a absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-brand-300/70 shadow-[0_0_12px_2px_rgba(139,125,255,0.7)]" />
        <span className="float-b absolute left-[28%] top-[68%] h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_12px_2px_rgba(103,232,249,0.6)]" />
        <span className="float-c absolute right-[18%] top-[30%] h-2 w-2 rounded-full bg-coral-400/70 shadow-[0_0_12px_2px_rgba(255,138,115,0.6)]" />
        <span className="float-b absolute right-[34%] bottom-[20%] h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]" />
      </div>

      {/* LEFT — hero (desktop) */}
      <div className="relative z-10 hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11">
            <span className="ai-gradient glow-pulse flex h-11 w-11 items-center justify-center rounded-2xl text-white">
              <Orbit size={22} strokeWidth={2.2} />
            </span>
            <span className="orbit-ring absolute inset-[-6px] rounded-full">
              <span className="orbit-dot" />
            </span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Connect<span className="text-brand-300">Sphere</span>
          </span>
        </div>

        <div className="max-w-lg">
          <h1 className="font-display text-6xl font-bold leading-[1.03]">
            <span className="rise rise-1 block">Connect,</span>
            <span className="rise rise-2 shimmer-text block">create,</span>
            <span className="rise rise-3 block">converse.</span>
          </h1>
          <p className="rise rise-4 mt-5 max-w-md text-lg leading-relaxed text-white/70">
            The social home for builders and creators — with AI woven in and
            conversations that happen live.
          </p>
          <ul className="mt-9 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="rise flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 backdrop-blur-md"
                style={{ animationDelay: `${0.5 + i * 0.13}s` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <Icon size={17} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/45">Built for creators. Powered by AI.</p>
      </div>

      {/* RIGHT — form (frosted glass, stays clean + usable) */}
      <div className="relative z-10 flex items-center justify-center p-5 sm:p-10">
        <div className="rise rise-2 w-full max-w-sm rounded-3xl border border-white/15 bg-white/85 p-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-8">
          <div className="mb-7 flex justify-center lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}