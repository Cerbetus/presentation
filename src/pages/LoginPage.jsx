import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 shadow-xl space-y-5"
      >
        <h1 className="text-2xl font-bold text-center text-white">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h1>

        {error && (
          <div className="bg-red-900/60 text-red-200 text-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-blue-900/40 text-blue-100 text-sm rounded-lg px-4 py-2">
            {notice}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Sign Up"}
        </button>

        {showResendConfirmation && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending || !email}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 font-medium py-3 rounded-lg transition"
          >
            {resending ? "Resending…" : "Resend confirmation email"}
          </button>
        )}

        <p className="text-center text-sm text-gray-400">
          {mode === "login" ? "No account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setShowResendConfirmation(false);
            }}
            className="text-blue-400 hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}
