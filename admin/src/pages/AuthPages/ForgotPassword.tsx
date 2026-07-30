import { useState } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../../icons";

// Step 1: Request reset
const RequestResetSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
});

// Step 2: Reset password
const ResetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("newPassword")], "Passwords must match"),
});

export default function ForgotPassword() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [resetToken, setResetToken] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Request Password Reset
  const requestFormik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema: RequestResetSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.post("/auth/forgot-password", {
          email: values.email,
        });

        if (response.data.success) {
          setResetToken(response.data.resetToken);
          setUserId(response.data.userId);
          setUserEmail(values.email);
          setSuccessMessage(
            "Reset link sent! Check your email or proceed below."
          );
          setStep("reset");
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Failed to request password reset. Please try again.";
        requestFormik.setFieldError("email", message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Step 2: Reset Password
  const resetFormik = useFormik({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: ResetPasswordSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.post("/auth/reset-password", {
          resetToken,
          userId,
          newPassword: values.newPassword,
        });

        if (response.data.success) {
          setSuccessMessage(response.data.message);
          setTimeout(() => {
            navigate("/signin", { replace: true });
          }, 2000);
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Failed to reset password. Please try again.";
        resetFormik.setFieldError("newPassword", message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <>
      <PageMeta title="Forgot Password" description="Reset your password" />
      <PageBreadCrumb pageTitle="Forgot Password" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <ComponentCard title="Forgot Password" className="md:col-span-6 md:col-start-4">
          {step === "request" ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Forgot Your Password?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Enter your email address and we'll send you a link to reset
                  your password
                </p>
              </div>

              {successMessage && (
                <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  {successMessage}
                </div>
              )}

              <form onSubmit={requestFormik.handleSubmit} className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={requestFormik.values.email}
                    onChange={requestFormik.handleChange}
                    onBlur={requestFormik.handleBlur}
                    touched={requestFormik.touched.email}
                    error={!!requestFormik.errors.email}
                  />
                  {requestFormik.touched.email && requestFormik.errors.email && (
                    <p className="mt-2 text-sm text-error-500">
                      {requestFormik.errors.email}
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !requestFormik.isValid}
                    className="flex-1"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/signin")}
                    className="flex-1"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Reset Your Password
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Enter your new password for {userEmail}
                </p>
              </div>

              {successMessage && (
                <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  {successMessage}
                </div>
              )}

              <form onSubmit={resetFormik.handleSubmit} className="space-y-6">
                {/* New Password */}
                <div>
                  <Label>
                    New Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="Enter your new password"
                      value={resetFormik.values.newPassword}
                      onChange={resetFormik.handleChange}
                      onBlur={resetFormik.handleBlur}
                      touched={resetFormik.touched.newPassword}
                      error={!!resetFormik.errors.newPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                    </button>
                  </div>
                  {resetFormik.touched.newPassword &&
                    resetFormik.errors.newPassword && (
                      <p className="mt-2 text-sm text-error-500">
                        {resetFormik.errors.newPassword}
                      </p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                  <Label>
                    Confirm Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm your new password"
                      value={resetFormik.values.confirmPassword}
                      onChange={resetFormik.handleChange}
                      onBlur={resetFormik.handleBlur}
                      touched={resetFormik.touched.confirmPassword}
                      error={!!resetFormik.errors.confirmPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? <EyeIcon /> : <EyeCloseIcon />}
                    </button>
                  </div>
                  {resetFormik.touched.confirmPassword &&
                    resetFormik.errors.confirmPassword && (
                      <p className="mt-2 text-sm text-error-500">
                        {resetFormik.errors.confirmPassword}
                      </p>
                    )}
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !resetFormik.isValid}
                    className="flex-1"
                  >
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("request");
                      requestFormik.resetForm();
                      setSuccessMessage("");
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </form>
            </>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
