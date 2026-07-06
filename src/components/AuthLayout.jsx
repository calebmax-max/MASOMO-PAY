import React from 'react';

const iconStyle = { width: 15, height: 15, display: 'block', flexShrink: 0 };

export function AuthAlertIcon() {
  return (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export default function AuthLayout({
  brandLabel = 'Masomo Pay',
  kicker,
  title,
  description,
  highlights = [],
  panelTitle = 'Sign in',
  children,
}) {
  return (
    <section className="portal-auth-shell">
      <div className="portal-auth-card">
        <aside className="portal-auth-hero">
          <div className="portal-auth-brand">
            <img
              src="/masomo-logo.png"
              alt="Masomo logo"
              className="brand-logo"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/logo512.png';
              }}
            />
            <span>{brandLabel}</span>
          </div>

          <div className="portal-auth-copy">
            {kicker ? <span className="portal-hero-kicker">{kicker}</span> : null}
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {highlights.length ? (
            <div className="portal-auth-highlights">
              {highlights.map((highlight) => (
                <div key={highlight.title}>
                  <strong>{highlight.title}</strong>
                  <span>{highlight.description}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="portal-auth-panel">
          <p className="portal-auth-title">{panelTitle}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
