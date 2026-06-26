import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '', size = 20 }) {
  return <Loader2 size={size} className={`animate-spin text-brand-500 ${className}`} />;
}
