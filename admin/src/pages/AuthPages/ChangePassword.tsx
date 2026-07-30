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

// Validation schema
const ChangePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required("Current password is required")
    .min(6, "Password must be at least 6 characters"),
  newPassword: Yup.string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters")
    .notOneOf(
      [Yup.ref("currentPassword")],
      "New password must be different from current password"
    ),
  confirmPassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("newPassword")], "Passwords must match"),
});

export default function ChangePassword() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: ChangePasswordSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("admin_token");

        const response = await axiosInstance.post(
          "/auth/change-password",
          {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data.success) {
          setSuccessMessage(response.data.message);
          formik.resetForm();
         
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Failed to change password. Please try again.";
        formik.setFieldError("currentPassword", message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <>
      <PageMeta title="Change Password" description="Change your admin password" />
      <PageBreadCrumb pageTitle="Change Password" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <ComponentCard title="Change Password" className="md:col-span-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Change Your Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Update your password to keep your account secure
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <Label>
                Current Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter your current password"
                  value={formik.values.currentPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  touched={formik.touched.currentPassword}
                  error={!!formik.errors.currentPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showCurrentPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              </div>
              {formik.touched.currentPassword && formik.errors.currentPassword && (
                <p className="mt-2 text-sm text-error-500">
                  {formik.errors.currentPassword}
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <Label>
                New Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter your new password"
                  value={formik.values.newPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  touched={formik.touched.newPassword}
                  error={!!formik.errors.newPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              </div>
              {formik.touched.newPassword && formik.errors.newPassword && (
                <p className="mt-2 text-sm text-error-500">
                  {formik.errors.newPassword}
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
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  touched={formik.touched.confirmPassword}
                  error={!!formik.errors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              </div>
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="mt-2 text-sm text-error-500">
                  {formik.errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !formik.isValid}
                className="flex-1"
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
