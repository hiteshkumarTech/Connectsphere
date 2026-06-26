import { Sparkles, MessageCircle, Zap } from 'lucide-react';
import Brand from '../Brand.jsx';

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'AI that writes captions and cleans up your posts' },
  { icon: MessageCircle, text: 'Real-time chat with typing and read receipts' },
  { icon: Zap, text: 'A feed that reacts the instant you do' },
];

export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / thesis panel */}
      <div className="ai-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
        <div className="relative">
          <Brand />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Connect, create, converse.
          </h1>
          <p className="mt-3 text-white/80">
            The social home for builders and creators — with AI woven in and
            conversations that happen live.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Built for creators. Powered by AI.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
