"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuthSync } from "@/lib/useAuthSync";

export default function AdminLoginPage() {
  const router = useRouter();
  useAuthSync(); // Check if admin or user is already logged in from another tab
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Send login request to backend using Axios
      const response = await axios.post("http://localhost:5000/auth/login", {
        studentId: studentId.trim(),
        password: password,
        type: "admin", // Specify that this is an admin login attempt
      });

      // Check if the account is a regular user trying to use admin login
      if (!response.data.isAdmin && response.data.type !== "admin") {
        setError("Only admin accounts can access the admin portal. Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        setIsLoading(false);
        return;
      }

      // Store admin session and token
      localStorage.setItem("adminLoggedIn", "true");
      localStorage.setItem("adminStudentId", studentId);
      localStorage.setItem("adminToken", response.data.token);

      setSuccess("Login successful! Redirecting to admin portal...");

      // Redirect after 1 second
      setTimeout(() => {
        router.push("/admin/portal");
      }, 1000);
    } catch (err: any) {
      // Check if error indicates this is a regular user account
      if (err.response?.status === 403 && err.response?.data?.message?.includes("not an admin")) {
        setError("Only admin accounts can access the admin portal. Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        setIsLoading(false);
        return;
      }

      setError(err.response?.data?.error || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white font-sans selection:bg-blue-500/30 min-h-screen">
      {/* Global Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-amber-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-orange-600 opacity-10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 left-6 group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:bg-gray-800/60 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-md"
        >
          <span>←</span>
          <span className="text-sm font-semibold hidden sm:inline">Back to Home</span>
        </button>

        {/* Login Container */}
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex flex-col items-center mb-10 transform transition-all hover:scale-[1.02] duration-500">
            <div className="relative mb-4 group cursor-default">
              <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
              <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 p-1 shadow-2xl ring-1 ring-white/10 flex items-center justify-center">
                <span className="text-3xl">👨‍💼</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400">
                ADMIN LOGIN
              </h1>
              <p className="text-gray-400 text-sm font-light">
                Access the administrative portal
              </p>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student ID Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Student ID
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., 12345678"
                  maxLength={8}
                  pattern="[0-9]{8}"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
                <p className="text-xs text-gray-500">8 digit student ID</p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded bg-gray-900/50 border-gray-700 text-amber-600 focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-gray-400 hover:text-gray-300 cursor-pointer transition-colors">
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-amber-500/20 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign In as Admin"}
              </button>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  {success}
                </div>
              )}
            </form>

            {/* Info */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-gray-500 text-center">Enter your 8-digit student ID and password to access the admin portal</p>
            </div>
          </div>

          {/* Footer Link */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-gray-400">
              Are you a regular user?{" "}
              <button
                onClick={() => router.push("/")}
                className="text-blue-400 hover:text-blue-300 transition-colors font-semibold"
              >
                Go back home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
