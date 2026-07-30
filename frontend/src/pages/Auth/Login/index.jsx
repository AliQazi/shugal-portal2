import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import logo from "../../../assets/images/logo.png";
import br from "../../../assets/images/br.png";
import iata from "../../../assets/images/iata.png";

// react-lottie aur apni downloaded json file import karein
import Lottie from "react-lottie";
import animationData from "../../../assets/animations/login.json";
import { theme } from "../../../theme/theme";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // react-lottie ki configurations
  const lottieOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

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
          window.location.href = "/dashboard";
          if (onLogin) onLogin(user);
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Server error. Please try again later.",
      );
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
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans">
        {/* ── LEFT PANEL (Full Screen Visuals & Local Lottie) ── */}
        <div
          style={{
            background: theme.colors.primary,
          }}
          className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        >
          {/* Ambient Glow Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-125 h-125 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-100 h-100px rounded-full blur-[100px] pointer-events-none" />

          {/* Top Branding Marker */}
          <div className="relative z-10 flex items-center">
            <img
              style={{
                height: "100px",
              }}
              src={iata}
              alt=""
              srcset=""
            />
          </div>

          {/* Centered React Lottie Component */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-8">
            <div className="w-full max-w-100 aspect-square drop-shadow-2xl pointer-events-none">
              {/* <Lottie options={lottieOptions} height={380} width={380} /> */}
              <img src={br} alt="" srcset="" />
            </div>

            <div className="text-center mt-4 max-w-sm">
              <h1 className="text-4xl font-extrabold text-[#FFEDD5] tracking-tight">
                Abid Air
              </h1>
            </div>
          </div>

          {/* Footer Text */}
        </div>

        {/* ── RIGHT PANEL (Full Screen Form) ── */}
        <div className="flex-1 md:w-1/2 flex flex-col justify-center items-center px-6 sm:px-16 lg:px-24 bg-white relative">
          <div className="w-full max-w-md space-y-8">
            {/* Logo & Heading */}
            <div className="flex flex-col items-start">
              <img
                src={logo}
                alt="logo"
                className="h-12 w-auto mb-8 object-contain transition-transform hover:scale-105"
              />
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                Welcome Back
              </h2>
              <p className="text-slate-500 text-sm mt-1.5">
                Please enter your details to sign in to your agent account.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              autoComplete="off"
            >
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2CA3B4] transition-colors">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:border-[#2CA3B4] focus:ring-4 focus:ring-[#2CA3B4]/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#2CA3B4] transition-colors">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:border-[#2CA3B4] focus:ring-4 focus:ring-[#2CA3B4]/10 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Remember & Forgot options */}
              <div className="flex justify-between items-center text-sm pt-0.5">
                <label className="flex items-center gap-2.5 text-slate-600 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    className="w-4.5 h-4.5 rounded-md border-slate-300 accent-[#21397C] transition-transform group-hover:scale-105"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="font-semibold text-[#2CA3B4] hover:text-[#21397C] hover:underline underline-offset-4 transition-all"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#2CA3B4]/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                style={{
                  background: theme.colors.primary,
                }}
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In <span className="text-base">→</span>
                  </span>
                )}
              </button>
            </form>

            {/* Register Link */}
            <p className="text-center text-sm text-slate-500 pt-4">
              Don't have an account?{" "}
              <Link
                to="/auth/register"
                className="font-bold text-[#2CA3B4] hover:text-[#21397C] hover:underline underline-offset-4 transition-all"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgot && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative"
            style={{
              animation: "fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xl font-light"
            >
              &times;
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#2CA3B4]/10 flex items-center justify-center mx-auto mb-4 text-[#2CA3B4]">
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Reset Password
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Enter your registered email and we'll route a link to you.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:border-[#2CA3B4] outline-none transition-all"
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-blue-900/10 hover:shadow-xl active:scale-[0.99]"
                style={{
                  background: theme.colors.primary,
                }}
              >
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Animations CSS */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default Login;
