// Next.js remounts `template.tsx` on every navigation (unlike layout.tsx),
// which is what lets the fade-in replay on each page instead of only once.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
