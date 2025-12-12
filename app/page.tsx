"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoginModal } from "@/components/index";
import { useAuthSync } from "@/lib/useAuthSync";

export default function Home() {
  const router = useRouter();
  useAuthSync(); // Check if user is already logged in from another tab
  
  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* Global Background Effect - Match Dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 bg-gray-800/40 backdrop-blur-md border-b border-white/10 flex-shrink-0 hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-xs md:text-sm font-bold flex-shrink-0">
              📍
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-white">Lost & Found</h1>
              <p className="text-xs text-gray-400">Campus Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 py-6 md:py-8 overflow-hidden">
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto space-y-4 md:space-y-6">
          
          {/* Logo and Title Section */}
          <div className="flex flex-col items-center">
            {/* Logo Area */}
            <div className="relative mb-3 md:mb-4 group cursor-default w-24 h-24 md:w-28 md:h-28">
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
              <div className="relative z-10 w-full h-full rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 p-1 shadow-2xl ring-1 ring-white/10">
                <img 
                  src="/cpclogo.png" 
                  alt="CPC Logo" 
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; 
                  }} 
                />
              </div>
            </div>

            {/* Title Typography */}
            <div className="text-center space-y-2 md:space-y-3">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 drop-shadow-sm leading-tight">
                LOST & FOUND
              </h1>
              
              <div className="flex items-center justify-center gap-2 md:gap-3 opacity-80 text-xs md:text-sm">
                <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                <span className="tracking-[0.2em] uppercase text-blue-200 font-medium whitespace-nowrap">
                  Campus Portal
                </span>
                <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <div className="text-center space-y-1 md:space-y-2">
            <p className="text-sm md:text-base text-gray-300 font-light leading-relaxed px-2">
              Help reunite lost items with their owners or browse what's been found
            </p>
            <p className="text-xs text-gray-500">
              Real-time messaging • Instant notifications • Secure & Private
            </p>
          </div>

          {/* Feature Cards - Hidden on mobile to save space */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-blue-500/30 transition-all hover:-translate-y-1">
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="text-sm font-bold text-white mb-1">Search Lost Items</h3>
              <p className="text-xs text-gray-400">Browse all reported lost items</p>
            </div>

            <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-green-500/30 transition-all hover:-translate-y-1">
              <div className="text-2xl mb-2">📦</div>
              <h3 className="text-sm font-bold text-white mb-1">Found Items</h3>
              <p className="text-xs text-gray-400">View items that have been found</p>
            </div>

            <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-purple-500/30 transition-all hover:-translate-y-1">
              <div className="text-2xl mb-2">💬</div>
              <h3 className="text-sm font-bold text-white mb-1">Real-Time Chat</h3>
              <p className="text-xs text-gray-400">Instant messaging with admins</p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col gap-2 w-full md:gap-3">
            <LoginModal />
            <button
              onClick={() => router.push("/signup")}
              className="w-full px-6 py-2.5 md:py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-green-500/20 transform hover:scale-105 text-sm md:text-base"
            >
              Create Account
            </button>
          </div>

          {/* Admin Portal Section */}
          <div className="w-full border-t border-white/10 pt-3 md:pt-4">
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-xs md:text-sm">Are you an administrator?</p>
              <button
                onClick={() => router.push('/admin/login')}
                className="w-full md:w-auto px-6 py-2 md:py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-amber-500/20 transform hover:scale-105 text-xs md:text-sm inline-block"
              >
                Admin Portal
              </button>
              <p className="text-gray-600 text-xs">Manage items & conversations</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-700 font-mono text-center mt-auto pt-2 md:pt-4">
          © 2024 CAMPUS PORTAL
        </div>
      </main>
    </div>
  );
}
