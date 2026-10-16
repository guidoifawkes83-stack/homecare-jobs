"use client";

import { useActionState } from "react";
import { requestSignIn, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    requestSignIn,
    initialState,
  );

  return (
    <form action={formAction} className="login-form">
      <h2>Welcome back</h2>
      <p>Enter the owner email address to receive a secure sign-in link.</p>
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="email"
        id="email"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "Sending link…" : "Email me a sign-in link"}
      </button>
      {state.error && (
        <p aria-live="polite" className="form-message error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p aria-live="polite" className="form-message" role="status">
          {state.success}
        </p>
      )}
      <div className="login-security">
        Private workspace · New accounts cannot be created from this page.
      </div>
    </form>
  );
}
