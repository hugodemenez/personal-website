import { BackButton } from '@/components/back-button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto py-8">
    <div className="mb-8">
        <BackButton />
      </div>
      <article className="prose prose-stone dark:prose-invert mx-auto wrap-break-word flex flex-col items-center">
        <h1 className="mb-4">404 - Page Not Found</h1>
        <p className="text-muted mb-8 text-center">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-accent text-white font-semibold shadow-sm hover:bg-accent-light focus:outline-none transition-colors"
        >
          Return to Home
        </Link>
      </article>
    </div>
  );
}
