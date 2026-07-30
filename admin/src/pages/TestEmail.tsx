import { useState, ChangeEvent, FormEvent } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";

export default function TestEmail() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.post(
        "/auth/forgot-password",
        { email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setResult({
        success: true,
        message: response.data.message,
        data: response.data,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || "Failed to send email",
        error: error.response?.data,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Test Email" description="Test email configuration" />
      <PageBreadCrumb pageTitle="Test Email Configuration" />

      <div className="grid grid-cols-1 gap-6">
        <ComponentCard title="Test Password Reset Email">
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📧 Email Configuration Test
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Enter an email address to test the password reset email functionality.
                This will send an actual email if the email service is configured.
              </p>
            </div>

            <form onSubmit={handleTest} className="space-y-6">
              <div>
                <Label>
                  Test Email Address <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  name="email"
                  placeholder="test@example.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter any email address registered in the system
                </p>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Sending..." : "Send Test Email"}
              </Button>
            </form>

            {result && (
              <div
                className={`mt-6 p-4 rounded-lg border ${
                  result.success
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    result.success
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {result.success ? "✅ Success" : "❌ Error"}
                </h4>
                <p
                  className={`text-sm mb-3 ${
                    result.success
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {result.message}
                </p>

                {result.data && (
                  <div className="mt-4 bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                ℹ️ Configuration Notes
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                <li>
                  • <strong>Development Mode:</strong> If email sending fails, you'll get the
                  reset token in the response
                </li>
                <li>
                  • <strong>Production Mode:</strong> Email must be properly configured in .env
                </li>
                <li>
                  • Check the backend console for detailed email logs
                </li>
                <li>
                  • See EMAIL_SETUP.md for configuration instructions
                </li>
              </ul>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
