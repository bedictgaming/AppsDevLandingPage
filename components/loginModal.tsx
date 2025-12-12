"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuthSync } from "@/lib/useAuthSync";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LoginModal() {
  const router = useRouter();
  useAuthSync(); // Check if user is already logged in from another tab
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await axios.post("http://localhost:5000/auth/login", {
        studentId: studentId.trim(),
        password: password,
        type: "user", // Specify that this is a user login attempt
      });

      // Check if the account is an admin trying to use user login
      if (response.data.isAdmin || response.data.type === "admin") {
        setError("Admin accounts must log in through the admin portal. Redirecting...");
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 2000);
        setIsSubmitting(false);
        return;
      }

      // Store token and user info
      localStorage.setItem("userToken", response.data.token);
      localStorage.setItem("studentId", studentId);
      localStorage.setItem("userId", response.data.id || response.data.userId); // Store the user ID from backend
      localStorage.setItem("userName", response.data.name || response.data.username || "User"); // Store the user name from backend

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      // Check if error indicates this is an admin account
      if (err.response?.status === 403 && err.response?.data?.message?.includes("admin")) {
        setError("Admin accounts must log in through the admin portal. Redirecting...");
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 2000);
        setIsSubmitting(false);
        return;
      }

      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        "Login failed. Please try again."
      );
      setIsSubmitting(false);
    }
  };


  return (
    <>   
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-blue-500/20 text-sm sm:text-base"
      >
        Login
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-bold">
              Login
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-4">

            <div>
              <label className="text-sm font-semibold text-gray-900">Student ID</label>
              <input
                type="text"
                placeholder="Enter 8-digit student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                maxLength={8}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 mt-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-blue-500/20"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-4 text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign up
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
