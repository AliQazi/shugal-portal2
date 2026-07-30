import { useState } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";

import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../Api/axios";
import logo from "../../assets/images/image.png"

// Validation schema
const SignInSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email").required("Email is required"),
    password: Yup.string().required("Password is required"),
});

export default function SignInForm() {
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();
    const canAccessAdminPortal = (user: { role?: string; userRole?: string }) =>
        user.role === "Admin" ||
        user.role === "Super Admin" ||
        user.userRole === "Super Admin";

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validationSchema: SignInSchema,
        onSubmit: async (values, { setSubmitting, setErrors }) => {
            try {
                const response = await axiosInstance.post("/auth/login", values, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                const { token, user } = response.data;

                if (token && canAccessAdminPortal(user)) {
                    login(user, token);
                    navigate("/", { replace: true });
                } else {
                    setError("Admin access only");
                }
            } catch (error: any) {
                setErrors({ email: "Invalid credentials" });
                setError((error as any).response.data.message);
                console.error("Login error", error);
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <div
            className="flex items-center justify-center min-h-screen w-full"
            style={{
                backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(/admin-portal/images/carousel/carousel-02.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'bottom',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-25 h-25 bg-white rounded-full flex items-center justify-center">
                        <img src={logo} alt="Logo" className="rounded-full" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="mb-8 text-center text-white text-lg">
                    Sign in to start your session
                </h2>

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div className="relative">
                        <Input
                            name="email"
                            placeholder="Email"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            touched={formik.touched.email}
                            error={!!formik.errors.email}
                            className="w-full pl-4 pr-10 py-3 bg-white text-gray-800 rounded"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                        </span>
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <Input
                            name="password"
                            type="password"
                            placeholder="••••••••••••••••"
                            value={formik.values.password}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            touched={formik.touched.password}
                            error={!!formik.errors.password}
                            className="w-full pl-4 pr-10 py-3 bg-white text-gray-800 rounded"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    {/* Sign In Button */}
                    <Button
                        type="submit"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded font-medium"
                        disabled={formik.isSubmitting}
                    >
                        {formik.isSubmitting ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
