import React from 'react';
import { navigateTo } from '../utils/navigation';

const links = [
  ['Dashboard', '/dashboard'],
  ['Students', '/students'],
  ['Payments', '/payments'],
  ['Reports', '/reports'],
  ['Settings', '/settings'],
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {links.map(([label, path]) => (
          <button key={path} type="button" className="sidebar-link" onClick={() => navigateTo(path)}>
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
