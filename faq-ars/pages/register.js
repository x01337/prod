// pages/register.js
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      router.push("/dashboard");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Create Account — ReplyAI</title>
      </Head>
      <div className="min-h-screen flex">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#0f1117] p-12 border-r border-[#2a2d3e]">
          <div><Logo /></div>
          <div className="space-y-6">
            <Feature icon="⚡" title="Instant setup" desc="Add your FAQs in minutes and you're live." />
            <Feature icon="🤖" title="Smart matching" desc="Keyword + Jaccard similarity finds the right answer." />
            <Feature icon="🔒" title="Your data" desc="Private per-account. Only you see your FAQs." />
          </div>
          <div className="text-xs text-[#4a4f6a] font-mono">Free forever for the MVP ✦</div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8"><Logo /></div>

            <div className="animate-fade-up">
              <h1 className="font-display text-2xl font-bold text-white mb-1">
                Create your account
              </h1>
              <p className="text-[#7c82a8] text-sm mb-8">
                Start answering customer questions automatically
              </p>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#7c82a8] mb-2 uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Your name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7c82a8] mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7c82a8] mb-2 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0b0f] font-semibold text-sm transition-all duration-200 glow-amber-sm hover:glow-amber"
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#4a4f6a]">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 3h12v7H9l-3 3V10H2V3z" fill="#0a0b0f" />
        </svg>
      </div>
      <span className="font-display font-bold text-white text-lg tracking-tight">ReplyAI</span>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="text-xl mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-[#4a4f6a] mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
