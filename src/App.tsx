import React, { Component, Suspense, lazy } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Loading } from './components/ui/State';
import Landing from './features/booking/Landing';
const BookingFlow = lazy(() => import('./features/booking/BookingFlow'));
const Admin = lazy(() => import('./features/admin/Admin'));
class ErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="container section">
        <h1>We could not open this page.</h1>
        <p>Please reload to try again. Your existing bookings have not been changed.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const location = useLocation();
  const admin = location.pathname.startsWith('/admin');
  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.title = admin
      ? 'Visit desk | Club Victorina'
      : location.pathname === '/book'
        ? 'Book a venue visit | Club Victorina'
        : 'Club Victorina | A place to gather in Lipa, Batangas';
  }, [location.pathname, admin]);
  return (
    <ErrorBoundary>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main');
          main?.setAttribute('tabindex', '-1');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        Skip to content
      </a>
      {!admin && <Header />}
      <Suspense
        fallback={
          <main id="main" className="container section">
            <Loading>Opening your page…</Loading>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/book" element={<BookingFlow />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="*"
            element={
              <main id="main" className="container section">
                <h1>This page is not here.</h1>
                <Link className="button" to="/">
                  Back to the venue
                </Link>
              </main>
            }
          />
        </Routes>
      </Suspense>
      {!admin && <Footer />}
    </ErrorBoundary>
  );
}
