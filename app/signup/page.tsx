"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useAuthSync } from "@/lib/useAuthSync";

export default function SignupPage() {
  const router = useRouter();
  useAuthSync(); // Check if user is already logged in from another tab
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.studentId || !formData.password || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (formData.studentId.length !== 8 || !/^\d{8}$/.test(formData.studentId)) {
      setError("Student ID must be exactly 8 digits");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("📝 Submitting signup form with data:", {
        name: formData.name,
        studentId: formData.studentId,
        passwordLength: formData.password.length,
      });

      const response = await axios.post("http://localhost:5000/auth/signup", {
        name: formData.name,
        studentId: formData.studentId,
        password: formData.password,
      });

      console.log("✅ Signup successful:", response.data);

      // Store the token and student ID if provided
      if (response.data.token) {
        localStorage.setItem("userToken", response.data.token);
      }
      localStorage.setItem("studentId", formData.studentId);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("❌ Signup error:", error);
      
      // Log detailed error for debugging
      if (error.response) {
        console.log("Response status:", error.response.status);
        console.log("Response data:", JSON.stringify(error.response.data, null, 2));
        console.log("Response headers:", error.response.headers);
      } else if (error.request) {
        console.log("No response received:", error.request);
      } else {
        console.log("Error message:", error.message);
      }
      
      // Get error message from various sources
      let errorMessage = "Signup failed. Please try again.";
      
      // Handle 422 specifically (Unprocessable Entity - validation error)
      if (error.response?.status === 422) {
        console.warn("⚠️ Validation error (422) received from backend");
      }
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors) {
        // Handle validation errors array
        if (Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.map((e: any) => 
            typeof e === 'string' ? e : e.message || JSON.stringify(e)
          ).join(", ");
        } else if (typeof error.response.data.errors === 'object') {
          // Handle validation errors object
          errorMessage = Object.entries(error.response.data.errors)
            .map(([field, msgs]: [string, any]) => {
              if (Array.isArray(msgs)) {
                return `${field}: ${msgs.join(", ")}`;
              }
              return `${field}: ${msgs}`;
            })
            .join("; ");
        }
      } else if (error.response?.data?.details) {
        // Handle detailed validation info
        errorMessage = error.response.data.details;
      }
      
      console.log("📢 Final error message displayed to user:", errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30 flex items-center justify-center p-4">
      {/* Global Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600 text-sm">
              Join our Lost & Found community
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Student ID Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Student ID
              </label>
              <input
                type="text"
                name="studentId"
                placeholder="Enter 8-digit student ID"
                value={formData.studentId}
                onChange={handleChange}
                maxLength={8}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Must be 8 digits</p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 mt-6 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-green-500/20"
            >
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/")}
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Login
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
