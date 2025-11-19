'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  return (
    <div>
      <h1 className="font-medium pt-12 mb-4">404 - Page Not Found</h1>
      <p className="text-muted mb-4">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="#"
        onClick={() => router.back()}
        className="text-accent hover:text-accent-light transition-colors"
      >
        Previous page
      </Link>
    </div>
  );
}
