// client/src/components/layout/Navbar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const Navbar: React.FC = () => {
  const activeClassName = "text-primary border-b-2 border-primary";
  const inactiveClassName = "hover:text-primary";

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3 md:flex md:justify-between md:items-center">
        <div className="flex justify-between items-center">
          <NavLink to="/" className="text-xl font-bold text-secondary">
            {/* Optional: Fügen Sie hier Ihr Logo ein, falls es in der Navbar sein soll */}
            {/* <img src="/path/to/your/logo.png" alt="Housnkuh Logo" className="h-8" /> */}
            Housnkuh
          </NavLink>
          {/* Mobile menu button (optional) */}
        </div>
        <div className="md:flex items-center">
          <ul className="flex flex-col md:flex-row md:mx-6 items-center">
            <li className="my-1 md:my-0 md:mx-4">
              <NavLink
                to="/"
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                Startseite
              </NavLink>
            </li>
            <li className="my-1 md:my-0 md:mx-4">
              <NavLink
                to="/direktvermarkter"
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                Direktvermarkter
              </NavLink>
            </li>
            <li className="my-1 md:my-0 md:mx-4">
              <NavLink
                to="/standort"
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                Standort
              </NavLink>
            </li>
            <li className="my-1 md:my-0 md:mx-4">
              <NavLink
                to="/mieten"
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                Verkaufsfläche mieten
              </NavLink>
            </li>
            <li className="my-1 md:my-0 md:mx-4">
              <NavLink
                to="/kontakt"
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                Kontakt
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; // << Diese Zeile ist wichtig!