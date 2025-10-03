import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./NavBarStyle.css";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className={`navbar ${open ? "open" : ""}`}>
      <div className="nav-brand">
        <NavLink to="/">CELTRIX</NavLink>
      </div>

      <button
        className="nav-toggle"
        aria-label="Toggle navigation"
        onClick={() => setOpen((s) => !s)}
      >
        ☰
      </button>

      <div className="nav-links" onClick={() => setOpen(false)}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "active nav-link" : "nav-link"
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/placeHolder"
          className={({ isActive }) =>
            isActive ? "active nav-link" : "nav-link"
          }
        >
          Place Holder
        </NavLink>
      </div>
    </nav>
  );
}
