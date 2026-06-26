import { Link } from 'react-router-dom';

// Renders post/comment text with @mentions (links) and #hashtags (styled).
export default function RichText({ text = '', className = '' }) {
  const parts = text.split(/(\s+)/);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]{3,30}$/.test(part)) {
          const username = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              to={`/u/${username}`}
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {part}
            </Link>
          );
        }
        if (/^#[a-zA-Z0-9_]{1,50}$/.test(part)) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              to={`/tag/${tag}`}
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
