import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-bold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink dark:text-white">
        We couldn't find that page
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The link may be broken or the post may have been removed.
      </p>
      <Link to="/" className="mt-6">
        <Button>
          <Compass size={18} /> Back to feed
        </Button>
      </Link>
    </div>
  );
}
