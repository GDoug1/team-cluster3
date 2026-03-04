import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    role: ""
  });

  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost/team-cluster3/backend"}/auth/register.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        }
      );

      const raw = await res.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || `Request failed with status ${res.status}` };
      }

      if (!res.ok) throw data;

      window.location.href = "/login";
    } catch (err) {
      setError(err.error || err.details || "Registration failed");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-panel">
          <span className="auth-pill">Team Cluster</span>
          <h1>Create your workspace</h1>
          <p>
            Invite leaders, set roles, and collaborate on team goals in minutes.
            Fill out the details below to get started.
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Role-based access</strong>
              <span>Give every member the right permissions.</span>
            </div>
            <div>
              <strong>Quick onboarding</strong>
              <span>Bring your organization online instantly.</span>
            </div>
          </div>
        </div>
        <form className="auth-card" onSubmit={handleSubmit}>
          <div>
            <h2 className="auth-heading">Register</h2>
            <p className="auth-subtitle">
              Create an account to access the cluster tools.
            </p>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <label className="auth-field">
            Full name
            <input
              className="auth-input"
              name="fullname"
              placeholder="Jane Cooper"
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-field">
            Work email
            <input
              className="auth-input"
              type="email"
              name="email"
              placeholder="name@company.com"
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-field">
            Password
            <input
              className="auth-input"
              type="password"
              name="password"
              placeholder="Create a secure password"
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-field">
            Select role
            <select
              className="auth-select"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select Role</option>
              <option value="admin">Admin</option>
              <option value="employee">User Employee</option>
              <option value="coach">Team Coach</option>
            </select>
          </label>

          <button type="submit" className="btn primary auth-submit">
            Create Account
          </button>

          <p className="auth-footer">
            Already have access? <a href="/login">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}