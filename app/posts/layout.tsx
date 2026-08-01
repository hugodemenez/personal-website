export default function PostsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="mx-auto max-w-xl px-4 pt-16 sm:px-0 sm:pt-24">
      {children}
    </main>
  );
}
