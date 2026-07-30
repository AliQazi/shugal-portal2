import { useState, useEffect } from "react";
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

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
}

// Validation schema
const ChangeUserPasswordSchema = Yup.object().shape({
  userId: Yup.string().required("User is required"),
  newPassword: Yup.string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: Yup.string()
    .required("Confirm password is required")
    .oneOf([Yup.ref("newPassword")], "Passwords must match"),
});

export default function ManageUserPasswords() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.get("/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        // Filter out admin users
        const nonAdminUsers = response.data.data.filter(
          (user: User) => user.role !== "Admin"
        );
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(value.toLowerCase()) ||
        user.email.toLowerCase().includes(value.toLowerCase()) ||
        (user.companyName &&
          user.companyName.toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredUsers(filtered);
  };

  const formik = useFormik({
    initialValues: {
      userId: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: ChangeUserPasswordSchema,
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("admin_token");

        const response = await axiosInstance.post(
          "/auth/admin/change-user-password",
          {
            userId: values.userId,
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
          setTimeout(() => {
            setSuccessMessage("");
          }, 5000);
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Failed to change password. Please try again.";
        formik.setFieldError("userId", message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const selectedUser = users.find((u) => u._id === formik.values.userId);

  return (
    <>
      <PageMeta title="Manage User Passwords" description="Manage user and agency passwords" />
      <PageBreadCrumb pageTitle="Manage User Passwords" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <ComponentCard title="Change User/Agency Password" className="md:col-span-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Change User/Agency Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Select a user or agency and set a new password for them
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* User Selection */}
            <div>
              <Label>
                Select User/Agency <span className="text-error-500">*</span>
              </Label>
              <div className="space-y-3">
                {/* Search Input */}
                <Input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />

                {/* User List */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-80 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-gray-500">
                      Loading users...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user._id} className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() =>
                            formik.setFieldValue("userId", user._id)
                          }
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            formik.values.userId === user._id
                              ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </p>
                              {user.companyName && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {user.companyName}
                                </p>
                              )}
                            </div>
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                              {user.role}
                            </span>
                          </div>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {formik.touched.userId && formik.errors.userId && (
                  <p className="text-sm text-error-500">{formik.errors.userId}</p>
                )}
              </div>
            </div>

            {/* Show selected user info */}
            {selectedUser && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  Selected: {selectedUser.name} ({selectedUser.role})
                </p>
              </div>
            )}

            {/* New Password */}
            <div>
              <Label>
                New Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formik.values.newPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  touched={formik.touched.newPassword}
                  error={!!formik.errors.newPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
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
                  placeholder="Confirm new password"
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
                onClick={() => {
                  formik.resetForm();
                  setSuccessMessage("");
                }}
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Info Card */}
        <ComponentCard title="Info" className="md:col-span-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Password Requirements
            </h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5"></span>
                <span>Minimum 6 characters</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5"></span>
                <span>Strong passwords recommended</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5"></span>
                <span>Passwords must match in confirmation</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5"></span>
                <span>User will need to log in again with new password</span>
              </li>
            </ul>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
