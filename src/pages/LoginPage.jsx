import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Footer from "../components/Footer";

const SIGNUP_COOLDOWN_MS = 60_000;
const RESET_COOLDOWN_MS = 60_000;
const SIGNUP_COOLDOWN_KEY = "authSignupCooldown";
const RESET_COOLDOWN_KEY = "authResetCooldown";

function getCooldownRemaining(key, durationMs) {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  const lastTs = Number(raw);
  if (!Number.isFinite(lastTs)) return 0;
  const remaining = durationMs - (Date.now() - lastTs);
  return remaining > 0 ? remaining : 0;
}

function startCooldown(key) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(Date.now()));
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [mode, setMode] = useState("login"); // login | signup

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription =
      queryParams.get("error_description") || hashParams.get("error_description");

    if (errorDescription) {
      setError(errorDescription);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setShowResendConfirmation(false);
    setLoading(true);

    if (mode === "signup") {
      const remaining = getCooldownRemaining(
        SIGNUP_COOLDOWN_KEY,
        SIGNUP_COOLDOWN_MS
      );
      if (remaining > 0) {
        setError(
          `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another signup email.`
        );
        setLoading(false);
        return;
      }
    }

    const { data, error: err } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/login`,
            },
          });

    if (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("email not confirmed")) {
        setNotice(
          "Your email is not confirmed yet. Open the latest confirmation email. If needed, resend it."
        );
        setShowResendConfirmation(true);
      }
      setLoading(false);
      return;
    }

    if (mode === "signup" && !data?.session) {
      setNotice(
        "Confirmation email sent. Check your inbox and click the link to finish your signup."
      );
      startCooldown(SIGNUP_COOLDOWN_KEY);
    }

    setLoading(false);
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError("Enter your email first so we can resend the confirmation link.");
      return;
    }

    setError(null);
    setNotice(null);
    setResending(true);

    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (err) {
      setError(err.message);
    } else {
      setNotice("A new confirmation email has been sent. Please check your inbox.");
    }

    setResending(false);
  }

  async function handlePasswordReset() {
    if (!email) {
      setError("Enter your email first so we can send a reset link.");
      return;
    }

    const remaining = getCooldownRemaining(
      RESET_COOLDOWN_KEY,
      RESET_COOLDOWN_MS
    );
    if (remaining > 0) {
      setError(
        `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another reset email.`
      );
      return;
    }

    setError(null);
    setNotice(null);
    setShowResendConfirmation(false);
    setResetting(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (err) {
      setError(err.message);
    } else {
      setNotice("Password reset email sent. Check your inbox.");
      startCooldown(RESET_COOLDOWN_KEY);
    }

    setResetting(false);
  }

  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link to="/" className="brand">
          Presentation Remote
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </header>

      <main className="flex items-center justify-center px-6 py-16">
        <form
          onSubmit={handleSubmit}
          className="glass-card w-full max-w-md p-8 space-y-6"
        >
          <div className="space-y-2 text-center">
            <div className="glass-badge">Secure Access</div>
            <h1 className="section-title">
              {mode === "login" ? "Sign In" : "Create Account"}
            </h1>
            <p className="muted text-sm">
              One account powers your Mac, phone, and tablet controls.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-sky-300/30 bg-sky-400/15 px-4 py-3 text-sm text-sky-100">
              {notice}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input"
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button glass-button-primary w-full disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={resetting || !email}
              className="text-xs text-sky-200 hover:text-white transition disabled:opacity-50"
            >
              {resetting ? "Sending reset..." : "Forgot password?"}
            </button>
          </div>

          {showResendConfirmation && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending || !email}
              className="glass-button glass-button-ghost w-full disabled:opacity-60"
            >
              {resending ? "Resending..." : "Resend confirmation email"}
            </button>
          )}

          <p className="text-center text-sm muted">
            {mode === "login" ? "No account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setShowResendConfirmation(false);
              }}
              className="text-sky-200 hover:text-white transition"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
