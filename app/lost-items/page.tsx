"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ChevronRight, Calendar, User, MapPin, X } from "lucide-react";
import axios from "axios";
import { subscribeToLostItemsUpdates } from "@/lib/pusher";

interface LostItem {
  id: string;
  title: string;
  description: string;
  location: string;
  image?: string;
  createdAt: string;
  isFound?: boolean;
  user?: {
    name: string;
    studentId: string;
  };
}

export default function LostItemsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchLostItems = async () => {
      try {
        const response = await axios.get("http://localhost:5000/lost-items");
        const items = response.data.items || [];
        console.log("=== LOST ITEMS DEBUG ===");
        console.log("Total items:", items.length);
        console.log("Full response:", response.data);
        items.forEach((item: LostItem, idx: number) => {
          console.log(`Item ${idx}:`, {
            id: item.id,
            title: item.title,
            image: item.image,
            fullURL: item.image ? `http://localhost:5000${item.image}` : "NO IMAGE"
          });
        });
        setLostItems(items);
      } catch (error) {
        console.error("Error fetching lost items:", error);
        setLostItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLostItems();
  }, []);

  // Subscribe to Pusher channel for real-time updates when items are marked as found
  useEffect(() => {
    console.log("🔌 Setting up Pusher subscription for lost items updates...");
    
    const unsubscribe = subscribeToLostItemsUpdates((data: any) => {
      console.log(`✨ PUSHER EVENT RECEIVED:`, data);
      console.log(`🔔 Lost item marked as found - ${data.itemId}`);
      
      // Remove the item from the list (it's now claimed)
      setLostItems((prevItems) => {
        console.log(`📊 Current lost items before filter:`, prevItems.length);
        const updated = prevItems.filter(item => item.id !== data.itemId);
        console.log(`✅ Removed item from lost items list. Remaining: ${updated.length}`);
        prevItems.forEach(item => {
          console.log(`   - Item: ${item.id} === ${data.itemId} ? ${item.id === data.itemId}`);
        });
        return updated;
      });
      
      // Close the item detail modal if it's the selected item
      if (selectedItem?.id === data.itemId) {
        console.log(`🚪 Closing modal for selected item`);
        setSelectedItem(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 Cleaning up Pusher subscription");
      unsubscribe();
    };
  }, [selectedItem]);

  const filteredItems = lostItems.filter(item =>
    (item.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30">
      {/* Global Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-blue-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-indigo-600 opacity-10 blur-[100px]"></div>
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center p-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
        
        {/* Header - Clickable to go back */}
        <button 
          onClick={() => router.back()} 
          className="group flex flex-col items-center mb-12 focus:outline-none"
        >
          <div className="relative mb-4 transition-transform group-hover:scale-105 duration-300">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <img 
              src="/cpclogo.png" 
              alt="Logo" 
              className="w-16 h-16 relative z-10 drop-shadow-2xl" 
              onError={(e) => e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-400 group-hover:text-blue-100 transition-colors">
            LOST & FOUND
          </h1>
          <span className="text-xs tracking-[0.3em] uppercase text-gray-500 mt-1 group-hover:text-blue-400 transition-colors">
            Campus Portal
          </span>
        </button>

        {/* Search Bar */}
        <div className="w-full max-w-lg mb-10 relative group">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <form onSubmit={handleSearch} className="relative flex shadow-2xl">
            <input 
              type="text" 
              placeholder="Search lost items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-6 pr-14 rounded-full bg-gray-800/80 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 backdrop-blur-md transition-all"
            />
            <button 
              type="submit" 
              className="absolute right-1 top-1 h-10 w-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors shadow-lg group-hover:shadow-blue-500/20"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>

        {/* Section Indicator */}
        <div className="mb-10 flex items-center gap-3 px-6 py-2 rounded-full bg-gray-800/40 border border-white/5 backdrop-blur-md">
          <div className="p-1.5 rounded-full bg-blue-500/20 text-blue-400">
            <PackageSearch className="w-5 h-5" />
          </div>
          <span className="text-lg font-medium text-gray-200">Lost Items Gallery</span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full px-4 mb-10">
          {loading ? (
            <p className="text-gray-400">Loading lost items...</p>
          ) : currentItems.length === 0 ? (
            <p className="text-gray-400">No lost items found.</p>
          ) : (
            currentItems.map((item) => (
              <LostItemCard key={item.id} item={item} onSelect={() => {
                setSelectedItem(item);
              }} />
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-6 mt-8">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
              >
                ← Prev
              </button>

              <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // Show first page, last page, current page, and adjacent pages
                  const isVisible = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1 || (pageNum === 2 && currentPage === 1) || (pageNum === totalPages - 1 && currentPage === totalPages);
                  
                  if (!isVisible && pageNum !== 2 && pageNum !== totalPages - 1) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-semibold transition-all text-sm
                        ${currentPage === pageNum
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30"
                          : "bg-gray-800/40 border border-white/10 text-gray-300 hover:border-blue-500/50 hover:bg-gray-800/60"
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:border-blue-500/50 hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
              >
                Next →
              </button>
            </div>

            <div className="text-xs sm:text-sm text-gray-400 text-center">
              Page {currentPage} of {totalPages} • Showing {currentItems.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </div>
          </div>
        )}
        
        {totalPages === 1 && filteredItems.length > 0 && (
          <div className="mt-8 text-sm text-gray-400 text-center">
            Showing all {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </div>
        )}
      </main>

      {/* Modal for Item Details */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-white/10 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Item Details</h2>
              <button
                onClick={() => {
                  setSelectedItem(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Item Image */}
              <div className="h-64 w-full bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                {selectedItem.image ? (
                  <img src={`http://localhost:5000${selectedItem.image}`} alt={selectedItem.title} className="w-full h-full object-cover" />
                ) : (
                  <PackageSearch className="w-16 h-16 text-white/30" />
                )}
              </div>

              {/* Item Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedItem.title}</h3>
                  <p className="text-gray-400 text-sm">Item Description</p>
                  <p className="text-gray-300 mt-2">{selectedItem.description}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Item Owner</p>
                      <p className="text-white font-medium">{selectedItem.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{selectedItem.user?.studentId || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Location Lost</p>
                      <p className="text-white font-medium">{selectedItem.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Date Lost</p>
                      <p className="text-white font-medium">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LostItemCard({ item, onSelect }: { item: LostItem; onSelect: () => void }) {
  const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <button
      onClick={onSelect}
      className="group relative bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 hover:bg-gray-800/60 transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col text-left cursor-pointer h-full"
    >
      <div className="h-40 w-full bg-gradient-to-br from-blue-900/40 to-indigo-900/40 group-hover:from-blue-800/40 group-hover:to-indigo-800/40 transition-colors flex items-center justify-center relative overflow-hidden">
        {item.image ? (
          <img src={`http://localhost:5000${item.image}`} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:16px_16px]" />
            <PackageSearch className="w-12 h-12 text-white/20 group-hover:scale-110 transition-transform duration-500" />
          </>
        )}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-medium text-gray-300">{dateStr}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {item.title}
          </h3>
        </div>
        
        <div className="text-sm text-gray-400 mb-3 line-clamp-2 flex-1">
          {item.description}
        </div>

        <div className="space-y-2 text-sm text-gray-400 flex-1">
          {item.user && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Owner</span>
                <span>{item.user.name}</span>
                <span className="text-xs text-gray-500">ID: {item.user.studentId}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>
        </div>
      </div>
    </button>
  );
}