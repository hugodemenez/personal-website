import { BackButton } from '@/components/back-button';

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto py-8">
      <div className="mb-8">
        <BackButton />
      </div>
      <article className="prose prose-stone dark:prose-invert mx-auto wrap-break-word">
        {children}
      </article>
    </div>
  );
}

