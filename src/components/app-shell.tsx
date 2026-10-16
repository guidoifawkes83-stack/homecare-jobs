import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/", label: "Jobs", icon: "▤" },
  { href: "/sources", label: "Sources", icon: "◉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function AppShell({
  children,
  title,
  description,
  dataLabel = "Live data",
}: {
  children: ReactNode;
  title: string;
  description: string;
  dataLabel?: string;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link aria-label="Home Care Jobs home" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">
            h
          </span>
          <span className="brand-name">
            homecare<span>jobs</span>
          </span>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navigation.map((item) => (
            <Link
              className={`nav-link${item.href === "/" && title === "Jobs" ? " active" : ""}${item.href === "/sources" && title === "Sources & runs" ? " active" : ""}${item.href === "/settings" && title === "Settings" ? " active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span aria-hidden="true" className="nav-icon">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">H</span>
            <span>
              <strong>Harold</strong>
              <small>Personal workspace</small>
            </span>
            <span aria-hidden="true" className="profile-more">
              ···
            </span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-chip">
              <span className="status-dot" />
              {dataLabel}
            </span>
            <ThemeToggle />
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {title === "Jobs" && (
              <span className="updated-label">
                <span className="status-dot" />
                All caught up
              </span>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
