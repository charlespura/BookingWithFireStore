import { AlertCircle, LoaderCircle } from 'lucide-react';
export function Loading({ children = 'Loading…' }: { children?: React.ReactNode }) {
  return (
    <div className="state" role="status">
      <LoaderCircle size={22} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
export function ErrorState({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
