"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ClipboardList, Search, LogOut } from "lucide-react";
import { dispatchLogoutEvent } from "@/lib/useAuthSync";
import axios from "axios";

export default function Dashboard() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("User");
  const [stats, setStats] = useState({ lost: 0, found: 0, claimed: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const userToken = localStorage.getItem("userToken");
      const storedStudentId = localStorage.getItem("studentId");
      
      if (!userToken) {
        console.log("User not logged in, redirecting to home");
        router.push("/");
        return;
      }

      if (storedStudentId) {
        setStudentId(storedStudentId);
      }

      // Verify JWT token is valid
      try {
        const response = await axios.get("http://localhost:5000/auth/profile", {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });
        
        if (!response.data) {
          throw new Error("Invalid token");
        }
        
        console.log("Token validated, user authenticated");
      } catch (error: any) {
        console.error("Token validation failed:", error);
        // Token is invalid/expired
        localStorage.removeItem("userToken");
        localStorage.removeItem("studentId");
        router.push("/");
      }
    };

    // Fetch stats
    const fetchStats = async () => {
      try {
        const lostRes = await axios.get("http://localhost:5000/lost-items");
        const foundRes = await axios.get("http://localhost:5000/found-items");

        // Only count lost items that are unresolved (isFound === false)
        const unresolvedLostCount = lostRes.data.items?.filter((item: any) => !item.isFound).length || 0;
        // Only count found items that are not claimed
        const foundCount = foundRes.data.items?.filter((item: any) => !item.isFound && item.status !== "claimed").length || 0;
        // Count claimed found items (isFound === true or status === "claimed")
        const claimedCount = foundRes.data.items?.filter((item: any) => item.isFound || item.status === "claimed").length || 0;

        setStats({ lost: unresolvedLostCount, found: foundCount, claimed: claimedCount });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    checkAuth();
    fetchStats();
  }, [router]);

  const navigateTo = (view: string) => {
    if (view === "lost-items") {
      router.push("/lost-items");
    } else if (view === "report-lost") {
      router.push("/report-lost");
    } else if (view === "found-items") {
      router.push("/found-items");
    } else if (view === "report-found") {
      router.push("/report-found");
    }
  };

  const handleLogout = () => {
    dispatchLogoutEvent();
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30">
       {/* Global Background Effect */}
       <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 bg-gray-800/40 backdrop-blur-md border-b border-white/10 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white"></h1>
              <p className="text-xs text-gray-400"></p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-200">{studentId}</p>
              <p className="text-xs text-gray-400">Student ID</p>
            </div>
            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-600/40 hover:border-red-500/50 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-screen flex flex-col">
        <DashboardHome 
          navigateTo={navigateTo} 
          onLogout={handleLogout}
          studentId={studentId}
          stats={stats}
        />
      </main>
    </div>
  );
}

// --- Views ---

function DashboardHome({ 
  navigateTo, 
  onLogout,
  studentId,
  stats
}: { 
  navigateTo: (view: string) => void
  onLogout: () => void
  studentId: string
  stats: { lost: number; found: number; claimed: number }
}) {
  return (
    <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10 md:mb-12 transform transition-all hover:scale-[1.02] duration-500">
          {/* Logo Area */}
          <div className="relative mb-6 group cursor-default">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
            <div className="relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 p-1 shadow-2xl ring-1 ring-white/10">
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
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 drop-shadow-sm">
              LOST & FOUND
            </h1>
            
            <div className="flex items-center justify-center gap-4 opacity-80">
              <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              <span className="text-xs md:text-sm tracking-[0.4em] uppercase text-blue-200 font-medium">
                Campus Portal
              </span>
              <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-10 space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white">Welcome back!</h2>
          <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">
            Help reunite lost items with their owners or browse what's been found
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-4xl mb-10 px-4">
          <div className="bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-500/20 rounded-xl p-4 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold text-red-300">{stats.lost}</p>
            <p className="text-xs text-red-300/70 mt-1">Lost Reports</p>
          </div>
          <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/20 rounded-xl p-4 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold text-green-300">{stats.found}</p>
            <p className="text-xs text-green-300/70 mt-1">Found Items</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold text-blue-300">{stats.claimed}</p>
            <p className="text-xs text-blue-300/70 mt-1">Claimed</p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl px-4">
          <DashboardButton 
            onClick={() => navigateTo("lost-items")}
            icon={<PackageSearch className="w-8 h-8" />}
            label="Search Lost Items"
            description="Find your lost item"
            colorScheme="red"
          />
          <DashboardButton 
            onClick={() => navigateTo("found-items")}
            icon={<Search className="w-8 h-8" />}
            label="Browse Found Items"
            description="See what's been found"
            colorScheme="green"
          />
          <DashboardButton 
            onClick={() => navigateTo("report-lost")}
            icon={<ClipboardList className="w-8 h-8" />}
            label="Report Lost Item"
            description="Report something lost"
            colorScheme="blue"
            isPrimary={true}
          />
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="text-xs text-gray-600 font-mono text-center mt-8">
        © 2024 CAMPUS PORTAL SYSTEM
      </div>
    </div>
  );
}

// --- Reusable Components ---

interface DashboardButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  colorScheme: "red" | "green" | "blue";
  isPrimary?: boolean;
}

function DashboardButton({ 
  onClick, 
  icon, 
  label,
  description,
  colorScheme,
  isPrimary = false
}: DashboardButtonProps) {
  const colorConfigs = {
    red: {
      bg: "from-red-900/40 to-red-900/20",
      border: "border-red-500/30 hover:border-red-500/60",
      icon: "bg-red-900/50 text-red-400 group-hover:text-red-300 group-hover:from-red-900 group-hover:to-red-950",
      text: "text-red-100 group-hover:text-red-50",
      glow: "group-hover:shadow-red-500/20"
    },
    green: {
      bg: "from-green-900/40 to-green-900/20",
      border: "border-green-500/30 hover:border-green-500/60",
      icon: "bg-green-900/50 text-green-400 group-hover:text-green-300 group-hover:from-green-900 group-hover:to-green-950",
      text: "text-green-100 group-hover:text-green-50",
      glow: "group-hover:shadow-green-500/20"
    },
    blue: {
      bg: "from-blue-900/40 to-blue-900/20",
      border: "border-blue-500/30 hover:border-blue-500/60",
      icon: "bg-blue-900/50 text-blue-400 group-hover:text-blue-300 group-hover:from-blue-900 group-hover:to-blue-950",
      text: "text-blue-100 group-hover:text-blue-50",
      glow: "group-hover:shadow-blue-500/20"
    }
  };

  const config = colorConfigs[colorScheme];

  return (
    <button 
      onClick={onClick}
      className="group relative w-full text-left"
    >
      <div className={`
        relative overflow-hidden
        h-40 md:h-44 w-full 
        rounded-2xl 
        bg-gradient-to-br ${config.bg}
        backdrop-blur-md
        border ${config.border}
        shadow-lg shadow-black/20
        ${config.glow}
        group-hover:-translate-y-2
        transition-all duration-300 ease-out
        flex flex-col items-center justify-center
        ${isPrimary ? 'ring-2 ring-yellow-400/50' : ''}
      `}>
        {/* Metallic/Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 opacity-50 group-hover:opacity-70 transition-opacity" />
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col items-center gap-2 group-hover:gap-3 transition-all duration-300">
          <div className={`
            p-3 rounded-xl 
            bg-gradient-to-b ${config.icon}
            shadow-inner ring-1 ring-white/10
            group-hover:scale-125 transition-transform duration-300
          `}>
            {icon}
          </div>
          
          <div className="text-center">
            <p className={`text-gray-200 font-bold text-sm md:text-base tracking-wide ${config.text} transition-colors`}>
              {label}
            </p>
            <p className="text-gray-400 text-xs mt-1 group-hover:text-gray-300 transition-colors">
              {description}
            </p>
          </div>

          {isPrimary && (
            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-xs font-semibold">
              ⭐ Primary
            </div>
          )}
        </div>

        {/* Shine Animation on Hover */}
        <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
      </div>
    </button>
  );
}
