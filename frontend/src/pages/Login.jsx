import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        "http://localhost/team-cluster/backend/auth/login.php",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await res.json();

      if (!res.ok) throw data;

      const normalizedRole = String(data.role || "").toLowerCase();
      if (data.fullname) {
        localStorage.setItem("teamClusterUser", JSON.stringify({
          fullname: data.fullname,
          role: data.role
        }));
      }
      const redirectPath = data.redirect
        || (normalizedRole.includes("admin")
          ? "/admin"
          : normalizedRole.includes("coach")
            ? "/coach"
            : "/employee");

      window.location.href = redirectPath;
    } catch (err) {
      setError(err.error || "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-panel">
          <span className="auth-pill">Team Cluster</span>
          <h1>Welcome back</h1>
          <p>
            coach@mail.com
          </p>
          <p>
            employee@mail.com
          </p>
          <p>
            admin@mail.com
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Centralized access</strong>
              <span>Keep schedules, roles, and updates in sync.</span>
            </div>
            <div>
              <strong>Live reporting</strong>
              <span>Monitor team activity as it happens.</span>
            </div>
          </div>
        </div>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <h2 className="auth-heading">Sign in</h2>
            <p className="auth-subtitle">
              Use your registered email and password.
            </p>
          </div>

        {error && <p className="auth-error">{error}</p>}

         <label className="auth-field">
            Email address
            <input
              className="auth-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>

        <label className="auth-field">
            Password
            <input
              className="auth-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
        <button type="submit" className="btn primary auth-submit">
            Login
          </button>

        <p className="auth-footer">
            No account? <a href="/register">Register</a>
          </p>
        </form>
      </div>
    </div>
  );
}