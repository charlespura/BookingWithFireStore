import type { ReactNode } from 'react';
export function SectionLink({
  target,
  children,
  className,
}: {
  target: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`#${target}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        document
          .getElementById(target)
          ?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
      }}
    >
      {children}
    </a>
  );
}
