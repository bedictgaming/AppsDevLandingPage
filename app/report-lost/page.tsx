"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, ArrowLeft, PackageSearch, LogOut } from "lucide-react";
import axios from "axios";
import { dispatchLogoutEvent } from "@/lib/useAuthSync";

export default function ReportLostItem() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [formData, setFormData] = useState({
    item: "",
    itemLastSeen: "",
    description: "",
    category: "",
    photo: null as File | null,
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is logged in when component mounts
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    setIsLoggedIn(!!token);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData({
        ...formData,
        photo: file,
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, photo: null });
    setPhotoPreview(null);
  };

  const handleLogout = () => {
    dispatchLogoutEvent();
    setIsLoggedIn(false);
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

      // Create FormData for multipart/form-data
      const submitData = new FormData();
      submitData.append("title", formData.item);
      submitData.append("description", formData.description);
      submitData.append("category", formData.category);
      submitData.append("location", formData.itemLastSeen);

      // Add image file if present
      if (formData.photo) {
        submitData.append("image", formData.photo);
      }

      const response = await axios.post(
        "http://localhost:5000/lost-items",
        submitData,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      console.log("Lost item posted successfully:", response.data);
      alert("Lost item reported successfully!");
      setIsSubmitting(false);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error posting lost item:", error);
      console.error("Error status:", error.response?.status);
      console.error("Server error details:", error.response?.data);
      
      setIsSubmitting(false);
      alert("Failed to submit lost item. Please try again.");
    }
  };

  // If not logged in, show login prompt
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30 flex items-center justify-center p-6">
        {/* Global Background Effect */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
          <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
        </div>

        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
            <PackageSearch className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-gray-400 mb-6">
              You need to sign up or login to report a lost item.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push("/signup")}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-blue-500/20"
              >
                Sign Up
              </button>
              
              <button
                onClick={() => router.back()}
                className="w-full py-3 px-6 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:bg-gray-800/60 font-bold uppercase tracking-wide transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30">
      {/* Global Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center p-6 animate-in fade-in duration-500 w-full max-w-4xl mx-auto">
        
        {/* Back Button + Logout */}
        <div className="w-full flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:bg-gray-800/60 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-md"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">Back</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-red-400 hover:bg-gray-800/60 hover:border-red-500/50 transition-all duration-300 backdrop-blur-md"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="flex flex-col items-center mb-12 transform transition-all hover:scale-[1.02] duration-500">
          <div className="relative mb-4 group cursor-default">
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 p-1 shadow-2xl ring-1 ring-white/10 flex items-center justify-center">
              <PackageSearch className="w-12 h-12 text-red-400" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400">
              Report Lost Item
            </h1>
            <p className="text-gray-400 text-sm md:text-base font-light">
              Help us find your lost item. Provide details to increase chances of recovery.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-2xl">
          <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Item Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Item Name
                </label>
                <input
                  type="text"
                  name="item"
                  placeholder="e.g., Blue Backpack, iPhone 14, etc."
                  value={formData.item}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Location Last Seen */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Location Last Seen
                </label>
                <input
                  type="text"
                  name="itemLastSeen"
                  placeholder="e.g., Canteen Area, Library, etc."
                  value={formData.itemLastSeen}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                >
                  <option value="">Select a category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Documents">Documents</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Bags">Bags</option>
                  <option value="Books">Books</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Describe your item in detail (color, brand, distinctive features, etc.)"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Upload Photo
                </label>
                
                {!photoPreview ? (
                  <label className="group relative w-full border-2 border-dashed border-gray-600 rounded-lg p-8 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer flex flex-col items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="p-3 rounded-lg bg-gray-900/50 w-fit mx-auto group-hover:bg-blue-500/10 transition-colors">
                        <Upload className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-300">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      name="photo"
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative group rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-sm font-semibold text-white">Change Photo</span>
                      <input
                        type="file"
                        name="photo"
                        onChange={handlePhotoChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-red-500/20"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 w-full max-w-2xl space-y-4 text-center">
          <p className="text-sm text-gray-400">
            ℹ️ Your report will be reviewed and displayed in the Lost Items gallery. Other students may help identify your item.
          </p>
        </div>
      </main>
    </div>
  );
}