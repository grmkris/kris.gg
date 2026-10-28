import Link from "next/link";

import { Contact } from "@/components/contact";

export function PublicFooter() {
  return (
    <footer className="public-footer" id="contact">
      <div className="public-container public-footer-grid">
        <div>
          <h2>Let’s build something.</h2>
          <p className="public-meta">Kristjan Grm, Ljubljana, Slovenia</p>
        </div>
        <Contact />
      </div>
      <div className="public-container public-colophon">
        <Link className="public-mark" href="/">
          kg
        </Link>
        <p>© {new Date().getFullYear()} kris.gg</p>
      </div>
    </footer>
  );
}
