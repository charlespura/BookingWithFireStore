import { SectionLink } from './ui/SectionLink';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
export function Header() {
  const { pathname } = useLocation();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" aria-label="Club Victorina, Lipa, Batangas home" className="brand">
          <span className="brand-mark" aria-hidden="true">
            V
          </span>
          <span>
            Club Victorina<small>Lipa, Batangas</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {pathname === '/' ? (
            <>
              <SectionLink target="spaces">Our spaces</SectionLink>
              <SectionLink target="visit">Plan a visit</SectionLink>
            </>
          ) : (
            <Link to="/">The venue</Link>
          )}
          <Link to="/book" className="button small">
            Book a time <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
