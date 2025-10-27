"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger */}
      <Button
        className="btncolor w-full sm:w-40 h-10"
        onClick={() => setOpen(true)}
      >
        LOGIN
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white text-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold">
              Login to Your Account
            </DialogTitle>
            <DialogDescription className="text-center text-gray-500 text-sm">
              Enter your credentials below to access your account.
            </DialogDescription>
          </DialogHeader>

          <form className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-sm font-semibold">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" className="btncolor w-full">
              Sign In
            </Button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm">
              Don’t have an account?{" "}
              <a href="/signup" className="text-blue-600 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
