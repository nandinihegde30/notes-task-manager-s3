
import React, { useState } from "react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      onLogin(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f4f2fb",
      padding: "20px"
    }}>
      <form onSubmit={submit} style={{
        background: "white",
        padding: "40px",
        borderRadius: "18px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 10px 35px rgba(0,0,0,0.08)"
      }}>
        <h1 style={{ color: "#7455c7", marginBottom: "8px" }}>
          NoteFlow.
        </h1>

        <p style={{ color: "#777", marginBottom: "28px" }}>
          {mode === "login"
            ? "Welcome back! Login to your workspace."
            : "Create your personal workspace."}
        </p>

        {mode === "register" && (
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={inputStyle}
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={6}
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "#dc3545", fontSize: "14px" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} style={{
          width: "100%",
          padding: "13px",
          background: "#7455c7",
          color: "white",
          border: "none",
          borderRadius: "9px",
          fontSize: "16px",
          cursor: "pointer",
          marginTop: "10px"
        }}>
          {loading
            ? "Please wait..."
            : mode === "login" ? "Login" : "Create account"}
        </button>

        <p style={{
          textAlign: "center",
          marginTop: "22px",
          color: "#666"
        }}>
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            style={{
              border: "none",
              background: "none",
              color: "#7455c7",
              cursor: "pointer",
              fontWeight: "bold",
              marginLeft: "5px"
            }}
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px",
  marginBottom: "15px",
  border: "1px solid #ddd",
  borderRadius: "8px",
  boxSizing: "border-box",
  fontSize: "14px"
};

export default Auth;
