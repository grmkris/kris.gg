import  { type ReactNode } from "react";

// A template re-mounts on every navigation (unlike layout), so wrapping the
// page in `.page-enter` gives a subtle cross-fade between routes. The masthead
// lives in layout (outside this), so it stays fixed across navigations. The
// fade is opacity-only — see the note on `.page-enter` in index.css.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
