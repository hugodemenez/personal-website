interface LayoutProps {
  children: React.ReactNode;
}

export default function SlugLayout({ children }: LayoutProps) {
  return (
    <>
      {children}
    </>
  );
}
