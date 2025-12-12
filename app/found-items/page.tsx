"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, ChevronRight, Calendar, User, MapPin, X, Send } from "lucide-react";
import axios from "axios";
import { subscribeToConversation } from "@/lib/pusher";

interface FoundItem {
  id: string;
  title?: string;
  name?: string;
  description: string;
  location: string;
  image?: string;
  category?: string;
  createdAt: string;
  postedBy?: string;
  user?: {
    id?: string;
    name: string;
    studentId: string;
  };
}

interface SelectItemOptions {
  preserveMessages?: boolean;
  skipSelection?: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "finder";
  timestamp: string;
}

export default function FoundItemsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<FoundItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showClaimed, setShowClaimed] = useState(false);

  const itemsPerPage = 8;
  const currentUserToken = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

  useEffect(() => {
    const fetchFoundItems = async () => {
      try {
        const response = await axios.get("http://localhost:5000/found-items");
        let items = [];

        // Handle both array and single item response
        if (Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (response.data.item) {
          items = [response.data.item];
        } else if (Array.isArray(response.data)) {
          items = response.data;
        }

        // Normalize items to have consistent properties
        items = items.map((item: any) => ({
          ...item,
          name: item.name || item.title,
          image: item.image,
          title: item.title || item.name,
        }));

        console.log("=== FOUND ITEMS DEBUG ===");
        console.log("Total items:", items.length);
        console.log("Full response:", response.data);
        console.log("First item keys:", items[0] ? Object.keys(items[0]) : "NO ITEMS");
        items.forEach((item: FoundItem, idx: number) => {
          console.log(`Item ${idx}:`, {
            id: item.id,
            name: item.name,
            image: item.image,
            fullURL: item.image ? `http://localhost:5000${item.image}` : "NO IMAGE",
            allKeys: Object.keys(item),
          });
        });
        setFoundItems(items);
      } catch (error) {
        console.error("Error fetching found items:", error);
        setFoundItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFoundItems();
  }, []);

  // Cleanup subscription when modal closes
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log("🧹 Cleaning up Pusher subscription");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedItem]); // Re-run when selectedItem changes

  const filteredItems = foundItems.filter((item: any) => {
    // Filter by claimed status
    const matchesClaimedStatus = showClaimed ? item.isFound : !item.isFound;
    
    // Filter by search term
    const matchesSearch = (item.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    return matchesClaimedStatus && matchesSearch;
  });

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

  const toggleClaimed = () => {
    setShowClaimed(!showClaimed);
    setCurrentPage(1);
    setSelectedItem(null);
  };

  const handleSelectItem = async (
    item: FoundItem,
    options: SelectItemOptions = {}
  ): Promise<string | null> => {
    const { preserveMessages = false, skipSelection = false } = options;

    // Cleanup old subscription before selecting new item
    if (unsubscribeRef.current) {
      console.log("🧹 Cleaning up old Pusher subscription before opening new item");
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!skipSelection) {
      setSelectedItem(item);
    }
    if (!preserveMessages) {
      setMessages([]);
    }
    setConversationId(null);

    // Try to load or create conversation
    try {
      // First, try to get or create conversation for this found item
      const response = await axios.post(
        "http://localhost:5000/chat/conversation",
        {
          foundItemId: item.id,
          subject: `Inquiry about ${item.name}`,
        },
        {
          headers: {
            Authorization: `Bearer ${currentUserToken}`,
          },
        }
      );

      if (response.data && response.data.conversation) {
        const conversationId = response.data.conversation.id;
        setConversationId(conversationId);
        console.log("✅ Conversation loaded/created:", conversationId);

        // Save conversation to user storage (localStorage) - KEEP SEPARATE FROM ADMIN
        const newConversation = {
          id: conversationId,
          foundItemId: item.id,
          itemName: item.name || item.title,
          userId: localStorage.getItem("userId"), // Store actual user ID, not token
          userName: localStorage.getItem("userName") || "User",
          studentId: localStorage.getItem("studentId") || "N/A",
          lastMessage: "Conversation started",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          messages: [],
        };

        try {
          // Use separate localStorage key for user conversations to prevent mixing with admin data
          const storedConversations = localStorage.getItem("userConversations");
          let conversations = storedConversations ? JSON.parse(storedConversations) : [];

          // Check if conversation already exists
          const existingIndex = conversations.findIndex((c: any) => c.id === conversationId);
          if (existingIndex === -1) {
            conversations.push(newConversation);
            localStorage.setItem("userConversations", JSON.stringify(conversations));
            console.log("✅ Conversation saved to user storage (isolated from admin)");
          }
        } catch (error) {
          console.error("Error saving conversation to user storage:", error);
        }

        // Load existing messages
        try {
          const messagesResponse = await axios.get(
            `http://localhost:5000/chat/messages/${conversationId}`,
            {
              headers: {
                Authorization: `Bearer ${currentUserToken}`,
              },
            }
          );

          // Map messages to match our format
          const userId = localStorage.getItem("userId");
          const formattedMessages = messagesResponse.data.messages.map((msg: any) => {
            // Use senderType directly if available (backend now provides this)
            // Falls back to ID comparison for backwards compatibility
            let sender: "user" | "finder" = "finder";

            if (msg.senderType === "user") {
              sender = "user";
            } else if (msg.senderType === "admin") {
              sender = "finder";
            } else if (msg.senderId === userId) {
              sender = "user";
            }

            return {
              id: msg.id,
              text: msg.content,
              sender: sender,
              timestamp: msg.createdAt,
            };
          });

          if (preserveMessages) {
            if (formattedMessages.length > 0) {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((msg: ChatMessage) => msg.id));
                const merged = [...prev];
                formattedMessages.forEach((msg: ChatMessage) => {
                  if (!existingIds.has(msg.id)) {
                    merged.push(msg);
                  }
                });
                return merged;
              });
            }
          } else {
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.log("No messages yet in conversation");
          if (!preserveMessages) {
            setMessages([]);
          }
        }

        // Subscribe to real-time updates via Pusher (store as ref to prevent multiple subscriptions)
        const unsubscribe = subscribeToConversation(conversationId, (data) => {
          console.log("📨 New message received via Pusher:", data);
          setMessages((prev) => {
            // FIRST: Check if message already exists by ID (most reliable)
            const messageExistsById = prev.some((msg: ChatMessage) => msg.id === data.id);
            if (messageExistsById) {
              console.log("❌ Message already exists by ID, skipping:", data.id);
              return prev;
            }

            // Get userId outside of the subscription to ensure it's available
            const currentUserId = localStorage.getItem("userId");

            // Use senderType directly if provided by backend
            let senderType: "user" | "finder" = "finder";

            if (data.senderType === "user") {
              senderType = "user";
            } else if (data.senderType === "admin") {
              senderType = "finder";
            } else if (currentUserId && data.senderId === currentUserId) {
              senderType = "user"; // Fallback: check if senderId matches current user
            }

            console.log(`✅ Determined sender type: ${senderType} (data.senderType: ${data.senderType}, senderId: ${data.senderId}, currentUserId: ${currentUserId})`);

            const localMessageIndex = prev.findIndex((msg: ChatMessage) =>
              msg.sender === "user" &&
              msg.text === data.content &&
              msg.id.startsWith("msg-") &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp || data.createdAt || new Date()).getTime()) < 10000
            );

            if (localMessageIndex !== -1) {
              console.log("✅ Backend confirmed local user message, updating ID:", data.id);
              const updatedMessages = [...prev];
              const previousMessage = updatedMessages[localMessageIndex];
              updatedMessages[localMessageIndex] = {
                ...previousMessage,
                id: data.id || previousMessage.id,
                timestamp: data.timestamp || data.createdAt || previousMessage.timestamp,
              };

              try {
                const storedConversations = localStorage.getItem("userConversations");
                if (storedConversations) {
                  const conversations = JSON.parse(storedConversations);
                  const convIndex = conversations.findIndex((c: any) => c.id === conversationId);
                  if (convIndex !== -1) {
                    const storedMsgIndex = conversations[convIndex].messages.findIndex((msg: any) => msg.id === previousMessage.id);
                    if (storedMsgIndex !== -1) {
                      conversations[convIndex].messages[storedMsgIndex] = {
                        ...conversations[convIndex].messages[storedMsgIndex],
                        id: data.id || conversations[convIndex].messages[storedMsgIndex].id,
                        timestamp: data.timestamp || data.createdAt || conversations[convIndex].messages[storedMsgIndex].timestamp,
                      };
                    }
                    localStorage.setItem("userConversations", JSON.stringify(conversations));
                  }
                }
              } catch (storageError) {
                console.error("Error syncing user conversation update:", storageError);
              }

              return updatedMessages;
            }

            // SECOND: Check if we already have this exact message (by content + sender + recent timestamp)
            // This prevents duplicate messages with same content from being added twice
            const isDuplicate = prev.some((msg: ChatMessage) =>
              msg.sender === senderType &&
              msg.text === data.content &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(data.createdAt || data.timestamp).getTime()) < 2000
            );

            if (isDuplicate) {
              console.log(`❌ Duplicate message detected (same sender, content, time):`, data.content.substring(0, 30));
              return prev;
            }

            const newMsg: typeof prev[0] = {
              id: data.id,
              text: data.content,
              sender: senderType,
              timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            };

            console.log(`✅ Adding ${senderType} message to chat:`, newMsg);

            // Update conversation in user localStorage (ISOLATED FROM ADMIN)
            try {
              const storedConversations = localStorage.getItem("userConversations");
              if (storedConversations) {
                let conversations = JSON.parse(storedConversations);
                const convIndex = conversations.findIndex((c: any) => c.id === conversationId);
                if (convIndex !== -1) {
                  conversations[convIndex].messages.push(newMsg);
                  conversations[convIndex].lastMessage = data.content;
                  conversations[convIndex].lastMessageTime = data.timestamp || data.createdAt;
                  localStorage.setItem("userConversations", JSON.stringify(conversations));
                  console.log("✅ User conversation updated in localStorage (isolated storage)");
                }
              }
            } catch (error) {
              console.error("Error updating conversation in user localStorage:", error);
            }

            return [...prev, newMsg];
          });
        });

        // Store unsubscribe function to cleanup when modal closes
        unsubscribeRef.current = unsubscribe;
        console.log("✅ Subscription setup complete, stored unsubscribe function");

        return conversationId;
      }
    } catch (error: any) {
      // If conversation creation fails, use offline mode
      if (error.response?.status === 404 || !error.response) {
        const tempId = `temp-${item.id}-${Date.now()}`;
        setConversationId(tempId);
        console.log("💻 Chat API not available, ready to start new conversation in offline mode");
        if (!preserveMessages) {
          setMessages([]);
        }
        return tempId;
      } else {
        console.error("Error loading conversation:", error);
        const tempId = `temp-${item.id}-${Date.now()}`;
        setConversationId(tempId);
        if (!preserveMessages) {
          setMessages([]);
        }
        return tempId;
      }
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedItem || !currentUserToken || !conversationId) return;

    const userMessage = messageInput;
    setMessageInput("");
    setIsSendingMessage(true);

    // Add message optimistically to UI immediately (don't wait for Pusher)
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newUserMessage = {
      id: messageId,
      text: userMessage,
      sender: "user" as const,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    console.log("✅ Message added optimistically to UI");

    try {
      // Send message - use offline mode if convId starts with 'temp-'
      if (conversationId.startsWith('temp-')) {
        // Offline mode - add message directly with Pusher triggers
        addMessageOffline(userMessage, conversationId);
      } else {
        // API mode - send via API
        try {
          const messageResponse = await axios.post(
            "http://localhost:5000/chat/message",
            {
              conversationId: conversationId,
              content: userMessage,
            },
            {
              headers: {
                Authorization: `Bearer ${currentUserToken}`,
              },
            }
          );

          console.log("✅ Message sent to backend successfully");
        } catch (error: any) {
          if (error.response?.status === 404) {
            // API became unavailable, fall back to offline mode
            addMessageOffline(userMessage, conversationId);
          } else {
            console.error("Error sending message to backend:", error);
            // Message already added optimistically, so it persists
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Message already added optimistically, so it persists
    } finally {
      setIsSendingMessage(false);
    }
  };

  const saveConversationToUserStorage = (convId: string, newMessage: any) => {
    try {
      // Use separate user storage key to prevent mixing with admin data
      const storedConversations = localStorage.getItem("userConversations");
      let conversations = storedConversations ? JSON.parse(storedConversations) : [];

      // Find or create conversation
      const existingConvIndex = conversations.findIndex((c: any) => c.id === convId);

      if (existingConvIndex !== -1) {
        // Update existing conversation
        conversations[existingConvIndex] = {
          ...conversations[existingConvIndex],
          messages: [...conversations[existingConvIndex].messages, newMessage],
          lastMessage: newMessage.text,
          lastMessageTime: newMessage.timestamp,
        };
      } else {
        // Create new conversation
        const userId = localStorage.getItem("userId");
        const studentId = localStorage.getItem("studentId") || "N/A";
        const userName = localStorage.getItem("userName") || "User";

        const newConversation = {
          id: convId,
          foundItemId: selectedItem?.id,
          itemName: selectedItem?.name || "Found Item",
          userId: userId || "unknown",
          userName: userName,
          studentId: studentId,
          lastMessage: newMessage.text,
          lastMessageTime: newMessage.timestamp,
          messages: [newMessage],
        };

        conversations.push(newConversation);
      }

      // Save back to user storage (ISOLATED FROM ADMIN)
      localStorage.setItem("userConversations", JSON.stringify(conversations));
      console.log("✅ Conversation saved to user storage (isolated)");
    } catch (error) {
      console.error("Error saving conversation to user storage:", error);
    }
  };

  const addMessageOffline = (userMessage: string, convId: string) => {
    const messageId = `${convId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage = {
      id: messageId,
      text: userMessage,
      sender: "user" as const,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Save to user storage (ISOLATED FROM ADMIN)
    saveConversationToUserStorage(convId, newMessage);

    // NOTE: Do NOT trigger Pusher events here - the backend API call already does this
    // Client-side triggering causes duplicates because the user subscribes and receives their own emit
    
    console.log("✅ Message saved locally, waiting for backend confirmation");
  };

  const fetchLatestMessages = async (convId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/chat/messages/${convId}`,
        {
          headers: {
            Authorization: `Bearer ${currentUserToken}`,
          },
        }
      );
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white font-sans selection:bg-blue-500/30">
      {/* Global Background Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-green-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-emerald-600 opacity-10 blur-[100px]"></div>
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center p-6 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
        
        {/* Header - Clickable to go back */}
        <button 
          onClick={() => router.back()} 
          className="group flex flex-col items-center mb-12 focus:outline-none"
        >
          <div className="relative mb-4 transition-transform group-hover:scale-105 duration-300">
            <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <img 
              src="/cpclogo.png" 
              alt="Logo" 
              className="w-16 h-16 relative z-10 drop-shadow-2xl" 
              onError={(e) => e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-400 group-hover:text-green-100 transition-colors">
            FOUND ITEMS
          </h1>
          <span className="text-xs tracking-[0.3em] uppercase text-gray-500 mt-1 group-hover:text-green-400 transition-colors">
            Campus Portal
          </span>
        </button>

        {/* Search Bar */}
        <div className="w-full max-w-lg mb-10 relative group">
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <form onSubmit={handleSearch} className="relative flex shadow-2xl">
            <input 
              type="text" 
              placeholder="Search found items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-6 pr-14 rounded-full bg-gray-800/80 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 backdrop-blur-md transition-all"
            />
            <button 
              type="submit" 
              className="absolute right-1 top-1 h-10 w-10 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center transition-colors shadow-lg group-hover:shadow-green-500/20"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </form>
        </div>

        {/* Section Indicator */}
        <div className="mb-10 flex items-center gap-3 px-6 py-2 rounded-full bg-gray-800/40 border border-white/5 backdrop-blur-md">
          <div className="p-1.5 rounded-full bg-green-500/20 text-green-400">
            <PackageSearch className="w-5 h-5" />
          </div>
          <span className="text-lg font-medium text-gray-200">
            {showClaimed ? "Claimed Items" : "Found Items Gallery"}
          </span>
        </div>

        {/* Toggle Claimed/Unclaimed Button */}
        <div className="mb-10 flex gap-4">
          <button
            onClick={toggleClaimed}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all border ${
              !showClaimed
                ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20"
                : "bg-gray-800/40 border-white/10 text-gray-300 hover:border-gray-600"
            }`}
          >
            Available Items ({foundItems.filter((item: any) => !item.isFound).length})
          </button>
          <button
            onClick={toggleClaimed}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all border ${
              showClaimed
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "bg-gray-800/40 border-white/10 text-gray-300 hover:border-gray-600"
            }`}
          >
            Claimed ({foundItems.filter((item: any) => item.isFound).length})
          </button>
        </div>

        {/* Grid */}
        <div className="w-full">
          {loading ? (
            <p className="text-center text-gray-400">Loading found items...</p>
          ) : currentItems.length === 0 ? (
            <p className="text-center text-gray-400">No found items match your search.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {currentItems.map((item) => (
                <FoundItemCard 
                  key={item.id} 
                  item={item} 
                  onSelect={() => handleSelectItem(item)} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-4 mt-12">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:border-green-500/50 hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`
                    w-10 h-10 rounded-lg font-semibold transition-all
                    ${currentPage === pageNum
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-900/30"
                      : "bg-gray-800/40 border border-white/10 text-gray-300 hover:border-green-500/50 hover:bg-gray-800/60"
                    }
                  `}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-gray-800/40 border border-white/10 text-gray-300 hover:text-white hover:border-green-500/50 hover:bg-gray-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-400">
          Showing {currentItems.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
        </div>
      </main>

      {/* Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in scale-in-95 duration-300">
            
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-gray-800/95 backdrop-blur-sm z-10">
              <h2 className="text-2xl font-bold text-white">Found Item Details</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 p-6">
              {/* Item Info */}
              <div className="flex-1 space-y-4">
                {/* Item Image */}
                <div className="h-48 w-full bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                  {selectedItem.image ? (
                    <img 
                      src={`http://localhost:5000${selectedItem.image}`} 
                      alt={selectedItem.name || "Found item"} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        console.error("❌ Modal image load error:", {
                          itemId: selectedItem.id,
                          attemptedUrl: `http://localhost:5000${selectedItem.image}`,
                          image: selectedItem.image
                        });
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log("✅ Modal image loaded successfully:", selectedItem.image);
                      }}
                    />
                  ) : (
                    <PackageSearch className="w-16 h-16 text-white/30" />
                  )}
                </div>

                {/* Item Details */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{selectedItem.name}</h3>
                    <p className="text-gray-400 text-sm">Item Description</p>
                    <p className="text-gray-300">{selectedItem.description}</p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">Founder</p>
                        <p className="text-white font-medium">{selectedItem.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{selectedItem.user?.studentId || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">Location Found</p>
                        <p className="text-white font-medium">{selectedItem.location}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase">Date Found</p>
                        <p className="text-white font-medium">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="flex-1 flex flex-col bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <div>
                      <p className="text-sm font-semibold text-white">Item Finder</p>
                      <p className="text-xs text-gray-400">Active Now</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 p-4 max-h-64 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      Start a conversation to claim this item
                    </div>
                  ) : (
                    messages.map((msg: ChatMessage) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom duration-300`}
                      >
                        <div className={`max-w-xs flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                          <p className={`text-xs font-semibold mb-1 ${msg.sender === "user" ? "text-green-300" : "text-gray-400"}`}>
                            {msg.sender === "user" ? "You" : "Admin Response"}
                          </p>
                          <div
                            className={`px-4 py-2 rounded-lg break-words ${
                              msg.sender === "user"
                                ? "bg-green-600/30 text-green-100 border border-green-500/30 rounded-br-none"
                                : "bg-gray-700/50 text-gray-200 border border-gray-600/30 rounded-bl-none"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <p className={`text-xs mt-1 text-gray-500`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="px-4 py-3 border-t border-white/10 bg-gray-900/80">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !isSendingMessage && handleSendMessage()}
                      disabled={isSendingMessage}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage}
                      className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
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

interface FoundItemCardProps {
  item: FoundItem;
  onSelect: () => void;
}

function FoundItemCard({ item, onSelect }: FoundItemCardProps) {
  const dateStr = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });

  return (
    <button
      onClick={onSelect}
      className="group relative bg-gray-800/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-green-500/30 hover:bg-gray-800/60 transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col text-left cursor-pointer"
    >
      <div className="h-40 w-full bg-gradient-to-br from-green-900/40 to-emerald-900/40 group-hover:from-green-800/40 group-hover:to-emerald-800/40 transition-colors flex items-center justify-center relative overflow-hidden">
        {item.image ? (
          <img 
            src={`http://localhost:5000${item.image}`} 
            alt={item.name || "Found item"} 
            className="w-full h-full object-cover" 
            onError={(e) => {
              console.error("❌ Card image load error for item:", {
                itemId: item.id,
                attemptedUrl: `http://localhost:5000${item.image}`,
                image: item.image
              });
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log("✅ Card image loaded successfully:", item.image);
            }}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:16px_16px]" />
            <PackageSearch className="w-12 h-12 text-white/20 group-hover:scale-110 transition-transform duration-500" />
          </>
        )}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-medium text-gray-300">{dateStr}</span>
        </div>
        
        {/* Claimed Badge */}
        {(item as any).isFound && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-md bg-blue-600/80 backdrop-blur-sm border border-blue-400/50 flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white">✓ CLAIMED</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
            {item.name}
          </h3>
        </div>

        <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
          {item.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{item.location}</span>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-white/5 bg-gray-900/50 flex items-center gap-2 group-hover:bg-gray-900 transition-colors">
        <User className="w-4 h-4 text-gray-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-300 truncate">
            {item.user?.name || "Unknown"}
          </p>
          <p className="text-xs text-gray-500 truncate">
            ID: {item.user?.studentId || "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 group-hover:text-green-400 transition-colors">
          <span className="text-xs font-medium">
            {(item as any).isFound ? "" : "Chat"}
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </button>
  );
}
