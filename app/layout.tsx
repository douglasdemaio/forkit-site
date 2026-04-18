// Root layout — delegates to [locale]/layout.tsx for HTML shell
// This exists only as a required Next.js root layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
