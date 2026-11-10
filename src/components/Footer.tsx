import { Link } from 'react-router-dom';
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link className="footer-brand" to="/">
              Club Victorina
            </Link>
            <p>Room for the people who matter.</p>
          </div>
          <p>
            Lipa City, Batangas
            <br />
            Philippines
          </p>
          <a href="mailto:events@clubvictorina.com">events@clubvictorina.com</a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Club Victorina</span>
          <span>All times in Asia/Manila (UTC+8)</span>
          <Link to="/admin">Staff sign in</Link>
        </div>
      </div>
    </footer>
  );
}
