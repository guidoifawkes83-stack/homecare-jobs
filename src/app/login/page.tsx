import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <Link aria-label="Home Care Jobs home" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">
            h
          </span>
          <span className="brand-name">
            homecare<span>jobs</span>
          </span>
        </Link>
        <div className="login-message">
          <span className="eyebrow">A calmer way to search</span>
          <h1>The right care role is out there.</h1>
          <p>
            Bring home care scheduling opportunities together in one thoughtful,
            private workspace.
          </p>
        </div>
        <div className="login-footnote">A personal job tracker for Harold.</div>
      </section>
      <section aria-label="Sign in" className="login-form-panel">
        <LoginForm />
      </section>
    </main>
  );
}
