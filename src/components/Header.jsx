import React from 'react'
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
]

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

const Header = ({ onLogout }) => {
  return (
    <header className="header">
      <div className="brand">
        <span className="icon-badge">N</span>
        <span className="brand-text">
          <span className="line1">Norvex</span>
          <span className="line2">Admin Panel</span>
        </span>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="logout-btn" onClick={onLogout}>
        <LogoutIcon />
        Deconectare
      </button>
    </header>
  )
}

export default Header