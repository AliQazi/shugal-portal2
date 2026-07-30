import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const performLogin = async (payload) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", {
        email: payload.email.trim(),
        password: payload.password,
      });
      if (res.status === 200 && res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem("frontend_token", token);
        localStorage.setItem("frontend_user", JSON.stringify(user));
        toast.success("Login successful!");
        if (user.role === "Admin") {
          window.location.href = "/admin-portal/";
        } else {
          if (onLogin) onLogin(user);
        }
      }
    } catch (error) {
      if (error.response) {
        const msg = error.response.data.message || "Login failed";
        toast.error(msg);
      } else {
        toast.error("Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    performLogin(formData);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefills = {
      email: params.get("email") || "",
      password: params.get("password") || "",
    };
    const shouldAuto =
      (params.get("auto") || params.get("autoLogin")) === "true";
    if (prefills.email || prefills.password) {
      setFormData((prev) => ({ ...prev, ...prefills }));
    }
    if (
      shouldAuto &&
      prefills.email &&
      prefills.password &&
      !autoLoginTriggered
    ) {
      setAutoLoginTriggered(true);
      performLogin(prefills);
    }
  }, [autoLoginTriggered]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await axiosInstance.post("/auth/forgot-password", {
        email: forgotEmail.trim(),
      });
      if (res.data?.success) {
        toast.success("Password reset link sent to your email.");
        setShowForgot(false);
      } else {
        toast.error(res.data?.message || "Failed to send reset link");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset link");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; }

        .login-page {
          min-height: 100vh;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-card {
          display: flex;
          width: 100%;
          max-width: 1200px;
          min-height: 540px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        }

        /* LEFT PANEL */
        .left-panel {
          background: #029CB2;
          flex: 1.1;
          padding: 36px 32px 28px 32px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: white;
        }

        .left-panel h1 {
          font-size: 26px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .company-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .company-card {
          background: rgba(255,255,255,0.18);
          border-radius: 10px;
          padding: 14px 16px;
        }

        .company-card .company-name {
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .company-card .company-detail {
          font-size: 12px;
          opacity: 0.9;
          line-height: 1.5;
        }

        .info-section {
          display: flex;
          gap: 32px;
          font-size: 13px;
        }

        .info-block h4 {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .info-block p {
          font-size: 12px;
          opacity: 0.92;
          line-height: 1.8;
        }

        .address-section {
          font-size: 13px;
        }

        .address-section h4 {
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .address-section p {
          font-size: 12px;
          opacity: 0.92;
        }

        .director-card {
          background: rgba(255,255,255,0.18);
          border-radius: 10px;
          padding: 14px 16px;
          text-align: center;
        }

        .director-card .name {
          font-size: 15px;
          font-weight: 700;
          font-style: italic;
        }

        .director-card .title {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 2px;
        }

        .signup-link {
          text-align: center;
          font-size: 13px;
          opacity: 0.9;
          margin-top: auto;
        }

        .signup-link a {
          color: white;
          font-weight: 700;
          text-decoration: none;
        }

        .signup-link a:hover { text-decoration: underline; }

        /* RIGHT PANEL */
        .right-panel {
          background: white;
          flex: 0.9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 40px;
        }

        .lock-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #029CB2;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .lock-icon-wrap svg {
          width: 30px;
          height: 30px;
          fill: white;
        }

        .right-panel h2 {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 28px;
        }

        .form-group {
          width: 100%;
          margin-bottom: 14px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          color: #555;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .form-group label span {
          color: #e74c3c;
        }

        .form-group input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #d0e8f0;
          border-radius: 8px;
          font-size: 14px;
          background: #f0f8fc;
          color: #222;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-group input:focus {
          border-color: #029CB2;
          box-shadow: 0 0 0 3px rgba(2,156,178,0.12);
          background: white;
        }

        .forgot-link {
          text-align: right;
          width: 100%;
          margin-bottom: 18px;
          margin-top: -6px;
        }

        .forgot-link button {
          background: none;
          border: none;
          color: #029CB2;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .signin-btn {
          width: 100%;
          padding: 13px;
          background: #029CB2;
          color: white;
          font-size: 16px;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          letter-spacing: 0.3px;
        }

        .signin-btn:hover:not(:disabled) { background: #0287A0; }
        .signin-btn:disabled { background: #aaa; cursor: not-allowed; }

        /* FORGOT MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-box {
          background: white;
          border-radius: 14px;
          padding: 28px 32px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 10;
        }

        .modal-box h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          font-size: 24px;
          color: #888;
          cursor: pointer;
        }

        .modal-close:hover { color: #333; }

        @media (max-width: 700px) {
          .login-card { flex-direction: column; }
          .company-cards { grid-template-columns: 1fr; }
          .info-section { flex-direction: column; gap: 12px; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          {/* LEFT PANEL */}
          <div className="left-panel">
            <h1>Welcome Back</h1>

            <div className="company-cards">
              <div className="company-card">
                <div className="company-name">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M3 21V7l9-4 9 4v14H3zm2-2h14V8.5l-7-3.1L5 8.5V19zm3-3h2v-4H8v4zm4 0h2v-4h-2v4zm4 0h2v-4h-2v4z" />
                  </svg>
                  Tours Vision travel and tours
                </div>
                <div className="company-detail">Licence: PR-3919</div>
              </div>
              <div className="company-card">
                <div className="company-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
                  </svg>
                  Barand Care 360 International
                </div>
                <div className="company-detail">
                  Overseas Employment Promoters
                  <br />
                  Licence: Nill
                </div>
              </div>
            </div>

            <div className="info-section">
              <div className="info-block">
                <h4>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                  </svg>
                  Phone
                </h4>
                <p>
                  +44 20 XXXX XXXX
                  <br />
                  +91 XXXX XXXXXX
                  <br />
                  +91 XXXX XXXXXX
                </p>
              </div>
              <div className="info-block">
                <h4>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  Email
                </h4>
                <p>
                  worldflytravelisb@gmail.com
                  <br />
                  worldflytravelisb@gmail.com
                </p>
              </div>
            </div>

            <div className="address-section">
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Address
              </h4>
              <p>1st Floor, City Center Plaza, Downtown Dubai, UAE</p>
            </div>

            <div className="director-card">
              <div className="name">Naeem Jaan</div>
              <div className="title">Managing Director</div>
            </div>

            <div className="signup-link">
              Don't have an account? <a href="/auth/register">Sign Up</a>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="right-panel">
            <div className="lock-icon-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            </div>
            <h2>Sign In</h2>

            <form
              onSubmit={handleSubmit}
              style={{ width: "100%" }}
              autoComplete="off"
            >
              <div className="form-group">
                <label>
                  Email Address <span>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder=""
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label>
                  Password <span>*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="forgot-link">
                <button type="button" onClick={() => setShowForgot(true)}>
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="signin-btn" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showForgot && (
        <div className="modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowForgot(false)}
            >
              ×
            </button>
            <h3>Write your email address.</h3>
            <form
              onSubmit={handleForgotPassword}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className="signin-btn"
                disabled={forgotLoading}
              >
                {forgotLoading ? "Sending..." : "Send Me Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
