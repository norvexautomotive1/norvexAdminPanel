import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../styles/Header.scss'

const navItems = [
  {
    to: '/home',
    label: 'Acasă',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 20V10l8-6 8 6v10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    to: '/reservations',
    label: 'Rezervări',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 9h18" />
      </svg>
    ),
  },
  {
    to: '/services-edits',
    label: 'Editare servicii',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    ),
  },
  {
    to: '/website-renovations',
    label: 'Renovare website',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    to: '/contact',
    label: 'Contact',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 4h16v16H4z" />
        <path d="M4 6l8 7 8-7" />
      </svg>
    ),
  },
  {
    to: '/password-change',
    label: 'Schimbă parola',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </svg>
    ),
  },
]

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

const Header = ({ onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="header">
      <div className="brand">
        <span className="icon-badge">N</span>
        <span className="brand-text">
          <span className="line1">Norvex</span>
          <span className="line2">Admin Panel</span>
        </span>
      </div>

      <nav className="admin-nav desktop-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="logout-btn desktop-logout" onClick={onLogout}>
        <LogoutIcon />
        Deconectare
      </button>

      <button
        type="button"
        className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
        aria-label="Deschide navigarea"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`mobile-nav-overlay ${isMenuOpen ? 'visible' : ''}`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      />

      <div className={`mobile-nav-panel ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <span className="mini-brand">Norvex</span>
          <button type="button" className="close-menu" onClick={closeMenu} aria-label="Închide navigarea">
            ×
          </button>
        </div>

        <nav className="admin-nav mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMenu}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="logout-btn mobile-logout"
          onClick={() => {
            closeMenu()
            onLogout()
          }}
        >
          <LogoutIcon />
          Deconectare
        </button>
      </div>
    </header>
  )
}

export default Header