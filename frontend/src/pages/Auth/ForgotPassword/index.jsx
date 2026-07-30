import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import Header from "../../../components/Header";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState("request"); // 'request' or 'reset'
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const navigate = useNavigate();

  // Check for token and userId in URL parameters
  useEffect(() => {
    const token = searchParams.get("token");
    const uid = searchParams.get("userId");
    
    if (token && uid) {
      setResetToken(token);
      setUserId(uid);
      setStep("reset");
      toast.info("Please enter your new password");
    }
  }, [searchParams]);

  const handleRequestReset = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is required");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.post(
        `/auth/forgot-password`,
        { email }
      );

      if (response.data.success) {
        // Check if we got the token in response (development mode)
        if (response.data.resetToken && response.data.userId) {
          setResetToken(response.data.resetToken);
          setUserId(response.data.userId);
          toast.success("Reset link sent! Proceed below to reset your password.");
          setStep("reset");
        } else {
          // Production mode - email was sent
          toast.success("Password reset link has been sent to your email. Please check your inbox.");
          // Optionally, you could show a message or redirect
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request password reset");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Both password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.post(
        `/auth/reset-password`,
        {
          resetToken,
          userId,
          newPassword,
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen w-full bg-no-repeat bg-cover bg-center bg-fixed relative" style={{
        backgroundImage: `url('https://images.pexels.com/photos/20277838/pexels-photo-20277838.jpeg')`,
        backgroundColor: "#000000",
      }}>
        <div className="absolute inset-0 bg-black/55 z-0" />

        {/* Modal overlay for request step */}
        {step === "request" && isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 sm:p-7 md:p-8 z-10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  Write your email address.
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setIsModalOpen(false)}
                  className="text-2xl text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded text-base font-semibold mt-1
                    ${isLoading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-[#2A166D] text-white hover:bg-[#3a1c9a] shadow-md"}
                    transition-all duration-200`}
                >
                  {isLoading ? "Sending..." : "Send Me Password"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Reset form (non-modal) */}
        {step === "reset" && (
          <div className="relative z-10 flex justify-center w-full px-4 sm:px-6 pt-32 pb-16">
            <div className="w-full max-w-lg rounded-2xl bg-white/95 shadow-2xl p-6 sm:p-7 md:p-8 flex flex-col gap-6 border border-white/70 backdrop-blur-md">
              <h2 className="text-2xl font-semibold text-gray-900 text-center">Create New Password</h2>
              <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    id="new-password"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showPassword ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D] focus:border-transparent text-gray-900 placeholder:text-gray-500"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  >
                    {showConfirmPassword ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700 font-medium mb-1">Password must:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">✓</span>
                      Be at least 6 characters long
                    </li>
                    <li className="flex items-center">
                      <span className="text-blue-600 mr-2">✓</span>
                      Match the confirmation
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded text-base font-semibold
                    ${isLoading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-[#2A166D] text-white hover:bg-[#3a1c9a] shadow-md"}
                    transition-all duration-200`}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setEmail("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setIsModalOpen(true);
                  }}
                  className="w-full py-3 rounded text-base font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Back
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
