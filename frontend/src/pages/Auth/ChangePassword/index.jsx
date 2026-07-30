import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import axios from "axios";
import { toast } from "react-toastify";
import Header from "../../../components/Header";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div
        className="min-h-screen w-full flex flex-col items-center justify-start 
         bg-no-repeat bg-cover bg-center bg-fixed relative"
        style={{
          backgroundImage: `url('https://images.pexels.com/photos/20277838/pexels-photo-20277838.jpeg')`,
          backgroundColor: "#000000",
          paddingTop: "60px",
        }}
      >
        <div className="absolute inset-0 bg-black/50 z-0" />

        {/* Top Text Section */}
        <div className="relative z-10 text-center mb-10">
          <span className="text-2xl md:text-3xl mt-20 font-bold mb-2 tracking-widest text-[#fff] block leading-tight animate-pulse">
            CHANGE PASSWORD
          </span>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-white">
            Update your password to keep your account secure
          </p>
        </div>

        {/* Centered Form */}
        <div className="z-10 flex justify-center items-center w-full px-4 mb-20 relative">
          <div
            className="w-full max-w-md rounded-3xl bg-white/90 shadow-2xl p-12 flex flex-col gap-6 border border-white/60 backdrop-blur-md"
            style={{
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            }}
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-6">
              {/* Current Password */}
              <div className="relative">
                <label className="text-base font-semibold text-gray-900 block mb-2">
                  Current Password
                </label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D]"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-[42px] text-gray-600 hover:text-gray-800"
                >
                  {showCurrentPassword ? (
                    <AiOutlineEyeInvisible size={22} />
                  ) : (
                    <AiOutlineEye size={22} />
                  )}
                </button>
              </div>

              {/* New Password */}
              <div className="relative">
                <label className="text-base font-semibold text-gray-900 block mb-2">
                  New Password
                </label>
                <input
                  id="new-password"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D]"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-[42px] text-gray-600 hover:text-gray-800"
                >
                  {showNewPassword ? (
                    <AiOutlineEyeInvisible size={22} />
                  ) : (
                    <AiOutlineEye size={22} />
                  )}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <label className="text-base font-semibold text-gray-900 block mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2A166D]"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[42px] text-gray-600 hover:text-gray-800"
                >
                  {showConfirmPassword ? (
                    <AiOutlineEyeInvisible size={22} />
                  ) : (
                    <AiOutlineEye size={22} />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 font-medium mb-1">Password must:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className="flex items-center">
                    <span className="text-blue-600 mr-2">✓</span>
                    Be at least 6 characters long
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-600 mr-2">✓</span>
                    Be different from your current password
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-600 mr-2">✓</span>
                    Match the confirmation
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-full text-lg font-semibold transition-all duration-300 
                  ${isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#2A166D] text-white hover:bg-[#3a1c9a]"
                  }`}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-3 rounded-full text-lg font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
