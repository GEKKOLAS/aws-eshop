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
      className={`flex flex-col gap-4 bg-gray-50/80 text-gray-800 dark:bg-white/5 dark:text-gray-100 p-3 rounded-md shadow-sm transition-all duration-200 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10z" fill="currentColor" />
          </svg>
          <span className={`font-semibold text-lg ${open ? "" : "sr-only"}`}>FundsApp</span>
        </div>

        <button
          aria-label={open ? "Contraer barra lateral" : "Expandir barra lateral"}
          onClick={toggle}
          className="p-1 rounded hover:bg-gray-200/40 dark:hover:bg-white/10"
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
              d={open ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
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
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor" />
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Home</span>
            </a>
          </li>

          <li>
            <a
              href="#funds"
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Fondos</span>
            </a>
          </li>

          <li>
            <a
              href="#transactions"
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Transacciones</span>
            </a>
          </li>

          <li>
            <a
              href="#subscriptions"
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-200/40 dark:hover:bg-white/5 transition-colors"
            >
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 9h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className={`${open ? "" : "sr-only"}`}>Suscripciones</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
