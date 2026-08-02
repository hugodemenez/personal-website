export default function PostsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>{children}</main>
  );
}
