"use client";
import React, { useState } from 'react'

type SideMenuProps = {
  open?: boolean;
  onToggle?: () => void;
};

export const SideMenu: React.FC<SideMenuProps> = ({ open: controlledOpen, onToggle }) => {
  const [internalOpen, setInternalOpen] = useState(true);
  const open = controlledOpen ?? internalOpen;
  const toggle = () => (onToggle ? onToggle() : setInternalOpen((v) => !v));

  return (
    <aside
      aria-label="Barra lateral"
      aria-expanded={open}
      className={`flex flex-col gap-4 bg-white/5 p-3 rounded-md shadow-sm transition-all duration-200 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-8 text-indigo-500"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10z" fill="currentColor" />
          </svg>
          <span className={`font-semibold text-lg ${open ? "" : "sr-only"}`}>Fondos</span>
        </div>

        <button
          aria-label={open ? "Contraer barra lateral" : "Expandir barra lateral"}
          onClick={toggle}
          className="p-1 rounded hover:bg-white/10"
          type="button"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d={open ? "M6 9l6 6 6-6" : "M6 15l6-6 6 6"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <nav aria-label="Navegación principal" className="flex-1">
        <ul className="flex flex-col gap-1">
          <li>
            <a
              href="#"
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10z" fill="currentColor" />
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Panel</span>
            </a>
          </li>

          <li>
            <a
              href="#funds"
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Fondos</span>
            </a>
          </li>

          <li>
            <a
              href="#balance"
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Balance</span>
            </a>
          </li>

          <li>
            <a
              href="#subscriptions"
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 9h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Suscripciones</span>
            </a>
          </li>

          <li>
            <a
              href="#settings"
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-300" viewBox="0 0 24 24" fill="none">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="2"/>
                <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.24a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .33-1.82 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.24c.7 0 1.28-.43 1.55-1A1.7 1.7 0 0 0 4.7 6.6l-.06-.06A2 2 0 1 1 7.47 3.7l.06.06c.4.4 1 .6 1.6.6h.12c.6 0 1.2-.2 1.6-.6l.06-.06A2 2 0 1 1 14.5 4.7l-.06.06c-.33.33-.5.82-.5 1.3v.12c0 .6.2 1.2.6 1.6.4.4 1 .6 1.6.6H18a2 2 0 0 1 0 4h-.24c-.7 0-1.28.43-1.55 1-.2.5 0 1 .33 1.33z" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Ajustes</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
