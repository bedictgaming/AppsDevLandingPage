"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Upload, X, Eye, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import axios from "axios";
import { dispatchAdminLogoutEvent } from "@/lib/useAuthSync";
import { subscribeToConversation, subscribeToAdminNotifications, triggerMessageEvent } from "@/lib/pusher";
import AdminSidebar from "@/app/components/AdminSidebar";

interface FoundItem {
  id?: string;
  title?: string;
  name?: string;
  location: string;
  description: string;
  image?: string | null;
  category?: string;
  createdAt?: string;
  postedBy?: string;
}

interface Conversation {
  id: string;
  foundItemId: string;
  itemName: string;
  userId: string;
  userName: string;
  studentId: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Array<{
    id: string;
    text: string;
    sender: "user" | "admin";
    timestamp: string;
  }>;
}

export default function AdminPortalPage() {
    const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscribedConvs = useRef<Set<string>>(new Set()); // ✅ Track subscribed conversations
  const messagesEndRef = useRef<HTMLDivElement>(null); // ✅ Auto-scroll to latest message
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("admin@college.edu");
  const [showModal, setShowModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    lostItems: 0,
    foundItems: 0,
    activeUsers: 0,
  });
  const [analytics, setAnalytics] = useState({
    foundWithPhotos: 0,
    lostWithPhotos: 0,
    avgItemsPerUser: 0,
    itemsWithMessages: 0,
    systemHealth: 100,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lostItems, setLostItems] = useState<any[]>([]);
  const [showLostItems, setShowLostItems] = useState(false);
  const [selectedLostItem, setSelectedLostItem] = useState<any | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFoundItems, setShowFoundItems] = useState(false);
  const [selectedFoundItem, setSelectedFoundItem] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState<"success" | "error">("success");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [markingAsFound, setMarkingAsFound] = useState(false);
  const [foundMessage, setFoundMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [markingFoundItemId, setMarkingFoundItemId] = useState<string | null>(null);
  const [postedItemMessage, setPostedItemMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activePostedItems = useMemo(
    () => items.filter((item: any) => !item.isFound && item.status !== "claimed"),
    [items]
  );

  // Combine lost and found items for admin view, with type labels
  const combinedLostAndFound = useMemo(() => {
    const lost = lostItems.map((item: any) => ({ ...item, _type: "Lost" }));
    const found = activePostedItems.map((item: any) => ({ ...item, _type: "Found" }));
    // Sort by createdAt descending
    return [...lost, ...found].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [lostItems, activePostedItems]);

  useEffect(() => {
    // Check authentication
    const checkAdminAuth = async () => {
      const adminLoggedIn = localStorage.getItem("adminLoggedIn");
      const adminToken = localStorage.getItem("adminToken");

      if (!adminLoggedIn || !adminToken) {
        router.push("/admin/login");
        return;
      }

      // Verify JWT token is valid
      try {
        const response = await axios.get("http://localhost:5000/auth/profile", {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        
        if (!response.data) {
          throw new Error("Invalid token");
        }
        
        console.log("Admin token validated");
      } catch (error: any) {
        console.error("Token validation failed:", error);
        // Token is invalid/expired
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminStudentId");
        localStorage.removeItem("adminToken");
        router.push("/admin/login");
        return;
      }
    };

    checkAdminAuth();

    const studentId = localStorage.getItem("adminStudentId") || "Admin";
    setAdminName(studentId);
    setAdminEmail(`Student ID: ${studentId}`);

    // Load profile picture from localStorage
    const savedProfilePic = localStorage.getItem("adminProfilePicture");
    if (savedProfilePic) {
      setProfilePicture(savedProfilePic);
    }
  }, [router]);

  // Define fetchConversations BEFORE useEffect that calls it
  const fetchConversations = useCallback(async (): Promise<Conversation[] | null> => {
    try {
      const adminToken = localStorage.getItem("adminToken");
      const response = await axios.get("http://localhost:5000/chat/admin/conversations", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (response.data.conversations && Array.isArray(response.data.conversations)) {
        const fetchedConvs = response.data.conversations.map((conv: any) => ({
          id: conv.id,
          foundItemId: conv.foundItemId,
          itemName: conv.foundItem?.title || "Unknown Item",
          userId: conv.userId,
          userName: conv.user?.name || "Unknown User",
          studentId: conv.user?.studentId || "N/A",
          lastMessage: conv.messages && conv.messages[0]?.content ? conv.messages[0].content : "No messages yet",
          lastMessageTime: conv.messages && conv.messages[0]?.createdAt ? conv.messages[0].createdAt : conv.createdAt,
          unreadCount: 0,
          messages: (conv.messages || []).map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            sender: msg.senderId === conv.userId ? "user" : "admin",
            timestamp: msg.createdAt,
          })),
        }));

        let mergedConversations: Conversation[] = [];

        setConversations((prevConvs) => {
          mergedConversations = fetchedConvs.map((fetchedConv: Conversation) => {
            const prevConv = prevConvs.find((c) => c.id === fetchedConv.id);

            if (!prevConv) {
              return fetchedConv;
            }

            const mergedMessages = [...fetchedConv.messages];

            prevConv.messages.forEach((localMsg) => {
              const isInBackend = mergedMessages.some((backendMsg) => backendMsg.id === localMsg.id);
              if (!isInBackend && localMsg.sender === "admin") {
                mergedMessages.push(localMsg);
                console.log("✅ Preserving unsent local admin message:", localMsg.id);
              }
            });

            mergedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            return {
              ...fetchedConv,
              messages: mergedMessages,
            };
          });

          return mergedConversations;
        });

        const unreadTotal = mergedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        setUnreadCount(unreadTotal);
        localStorage.setItem("adminConversations", JSON.stringify(mergedConversations));
        console.log(`✅ Conversations fetched from backend with smart merge: ${mergedConversations.length}`);
        return mergedConversations;
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn("Session expired or forbidden. Redirecting to login.");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminStudentId");
        localStorage.removeItem("adminProfilePicture");
        localStorage.removeItem("adminConversations");
        alert("Your session has expired or you do not have access. Please log in again.");
        window.location.href = "/admin/login";
        return null;
      }
      console.error("Error fetching conversations:", error);
      try {
        const storedConversations = localStorage.getItem("adminConversations");
        if (storedConversations) {
          const convs: Conversation[] = JSON.parse(storedConversations);
          setConversations(convs);
          const unread = convs.reduce((sum, conv) => sum + conv.unreadCount, 0);
          setUnreadCount(unread);
          return convs;
        }
      } catch (e) {
        console.error("Error loading from localStorage:", e);
        setConversations([]);
      }
      return null;
    }
  }, []);


  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Fetch both found and lost items
        const foundResponse = await axios.get("http://localhost:5000/found-items");
        const lostResponse = await axios.get("http://localhost:5000/lost-items");
        const foundData = foundResponse.data.items || [];
        const lostData = lostResponse.data.items || [];
        // Filter out items marked as found from the lost items list
        const activeLostItems = lostData.filter((item: any) => !item.isFound);
        setItems(foundData);
        setLostItems(activeLostItems);
        // Update stats using only available/unclaimed found items and unresolved lost items
        const availableFoundItems = foundData.filter((item: any) => !item.isFound && item.status !== "claimed");
        const unresolvedLostItems = lostData.filter((item: any) => !item.isFound);
        setStats((prev) => ({
          ...prev,
          foundItems: availableFoundItems.length,
          lostItems: unresolvedLostItems.length,
          totalReports: availableFoundItems.length + unresolvedLostItems.length,
        }));
        // Update analytics
        const foundWithPhotos = foundData.filter((item: any) => item.image || item.photo).length;
        const lostWithPhotos = activeLostItems.filter((item: any) => item.image || item.photo).length;
        setAnalytics((prev) => ({
          ...prev,
          foundWithPhotos,
          lostWithPhotos,
          systemHealth: foundData.length > 0 ? Math.min(100, Math.round((foundWithPhotos / foundData.length) * 100)) : 100,
        }));
        // Fetch conversations
        fetchConversations();
        // Subscribe to new conversations via Pusher
        subscribeToAllConversations();
        // Subscribe to admin notifications for new conversations
        subscribeToAdminNotifications((data) => {
          console.log("Admin notification received:", data);
          // First, fetch the latest conversations from localStorage
          const storedConversations = localStorage.getItem("adminConversations");
          if (storedConversations) {
            try {
              const convs = JSON.parse(storedConversations);
              setConversations(convs);
              const unread = convs.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0);
              setUnreadCount(unread);
              // Update selected conversation if it's currently open
              const selectedConv = convs.find((c: Conversation) => c.id === selectedConversation?.id);
              if (selectedConv && selectedConversation?.id === selectedConv.id) {
                setSelectedConversation(selectedConv);
              }
              console.log("✅ Conversations loaded from localStorage:", convs.length);
            } catch (error) {
              console.error("Error parsing conversations from localStorage:", error);
            }
          }
        });
        // Listen for localStorage changes from other tabs or same tab
        const handleStorageChange = () => {
          console.log("Admin conversations updated in localStorage");
          // Load from localStorage instead of re-fetching from backend
          const storedConversations = localStorage.getItem("adminConversations");
          if (storedConversations) {
            try {
              const convs = JSON.parse(storedConversations);
              setConversations(convs);
              const unread = convs.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0);
              setUnreadCount(unread);
              // Update selected conversation if it's currently open
              const selectedConv = convs.find((c: Conversation) => c.id === selectedConversation?.id);
              if (selectedConv && selectedConversation?.id === selectedConv.id) {
                setSelectedConversation(selectedConv);
              }
            } catch (error) {
              console.error("Error loading from localStorage:", error);
            }
          }
        };
        window.addEventListener("storage", handleStorageChange);
        // Poll localStorage every 5 seconds to sync backend changes, but use smart merge
        const pollInterval = setInterval(() => {
          console.log("🔄 Polling backend for new conversations...");
          fetchConversations(); // This now uses smart merge instead of overwriting
        }, 5000);
        // Cleanup function
        return () => {
          window.removeEventListener("storage", handleStorageChange);
          clearInterval(pollInterval);
        };
      } catch (error) {
        console.error("Error fetching items:", error);
        setItems([]);
        setLostItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
    // No JSX should be returned from useEffect
    // Only return a cleanup function if needed
  }, []);

  // Keep track of subscribed conversation IDs
  const subscribeToAllConversations = () => {
    try {
      console.log(`Setting up subscriptions for ${conversations.length} conversations`);
      
      conversations.forEach((conv: Conversation) => {
        // Only subscribe if not already subscribed
        if (subscribedConvs.current.has(conv.id)) {
          console.log(`Already subscribed to ${conv.id}, skipping`);
          return;
        }
        
        subscribedConvs.current.add(conv.id);
        console.log(`✅ Subscribing to conversation channel: conversation-${conv.id}`);
        
        subscribeToConversation(conv.id, (data: any) => {
          console.log(`📨 Message received on conversation-${conv.id}:`, data);
          
          // Update conversations in state
          setConversations((prevConvs) => {
            return prevConvs.map((c) => {
              if (c.id === conv.id) {
                // Check if message already exists by ID (prevent duplicates)
                const messageExistsById = c.messages.some((msg) => msg.id === data.id);
                if (messageExistsById) {
                  console.log("❌ Message already exists by ID, skipping:", data.id);
                  return c;
                }

                // Determine sender type - check the sender field first (string: 'user' or 'admin')
                let senderType: "user" | "admin" = "admin"; // Default to admin
                
                if (data.sender === 'user') {
                  senderType = "user"; // Message explicitly marked as user
                } else if (data.sender === 'admin') {
                  senderType = "admin"; // Message explicitly marked as admin
                } else if (data.senderId === c.userId) {
                  senderType = "user"; // senderId matches conversation user
                } else if (data.sender?.id === c.userId) {
                  senderType = "user"; // sender.id matches conversation user
                }
                
                console.log(`✅ Determined sender type: ${senderType} (data.sender: ${JSON.stringify(data.sender)}, data.senderId: ${data.senderId}, c.userId: ${c.userId})`);

                // Check if this is a backend confirmation of a local message (same content, within 10 sec, same sender type)
                // If so, UPDATE the local message ID instead of treating it as duplicate
                const localMessageIndex = c.messages.findIndex((msg) =>
                  msg.sender === senderType &&
                  msg.text === data.content &&
                  Math.abs(new Date(msg.timestamp).getTime() - new Date(data.timestamp || new Date()).getTime()) < 10000 &&
                  msg.id.startsWith('admin-') // This is a locally-created admin message waiting for backend ID
                );

                if (localMessageIndex !== -1) {
                  // This is the backend confirmation of a local message - update the ID
                  console.log(`✅ Backend confirmed local message, updating ID from ${c.messages[localMessageIndex].id} to ${data.id}`);
                  const updatedMessages = [...c.messages];
                  updatedMessages[localMessageIndex] = {
                    ...updatedMessages[localMessageIndex],
                    id: data.id || updatedMessages[localMessageIndex].id,
                    timestamp: data.timestamp || data.createdAt || updatedMessages[localMessageIndex].timestamp,
                  };

                  const updatedConv = {
                    ...c,
                    messages: updatedMessages,
                    lastMessage: data.content,
                    lastMessageTime: data.timestamp || data.createdAt || new Date().toISOString(),
                  };

                  // Save to localStorage for backup
                  const allConversations = prevConvs.map((conv) => conv.id === c.id ? updatedConv : conv);
                  localStorage.setItem("adminConversations", JSON.stringify(allConversations));

                  console.log(`✅ Conversation ${conv.id} updated with backend ID confirmation`);
                  return updatedConv;
                }

                // Otherwise, check for duplicates (shouldn't happen if above logic works)
                const isDuplicate = c.messages.some((msg) => 
                  msg.sender === senderType && 
                  msg.text === data.content &&
                  Math.abs(new Date(msg.timestamp).getTime() - new Date().getTime()) < 10000
                );
                
                if (isDuplicate) {
                  console.log(`❌ Duplicate ${senderType} message detected, skipping:`, data.content.substring(0, 50));
                  return c;
                }

                // This is a new message from Pusher
                const newMessage = {
                  id: data.id || `msg-${Date.now()}`,
                  text: data.content,
                  sender: senderType,
                  timestamp: data.createdAt || data.timestamp || new Date().toISOString(),
                };

                const updatedConv = {
                  ...c,
                  messages: [...c.messages, newMessage],
                  lastMessage: data.content,
                  lastMessageTime: data.createdAt || data.timestamp || new Date().toISOString(),
                  unreadCount: senderType === "user" ? c.unreadCount + 1 : c.unreadCount,
                };
                
                // Save to localStorage for backup
                const allConversations = prevConvs.map((conv) => conv.id === c.id ? updatedConv : conv);
                localStorage.setItem("adminConversations", JSON.stringify(allConversations));
                
                console.log(`✅ Conversation ${conv.id} updated with new message from ${senderType}`);
                return updatedConv;
              }
              return c;
            });
          });

          // Update unread count only for user messages
          if (data.sender === 'user' || data.senderId === conv.userId || data.sender?.id === conv.userId) {
            setUnreadCount((prev) => prev + 1);
          }
        });
      });
    } catch (error) {
      console.error("Error subscribing to conversations:", error);
    }
  };

  // ✅ NEW: Watch for new conversations and subscribe to them
  useEffect(() => {
    if (conversations.length > 0) {
      console.log(`🔄 Checking subscriptions for ${conversations.length} conversations`);
      subscribeToAllConversations();
    }
  }, [conversations.length]); // Only trigger when conversation count changes

  // ✅ NEW: Update selected conversation when conversations change
  useEffect(() => {
    if (selectedConversation) {
      const updatedConv = conversations.find((c) => c.id === selectedConversation.id);
      if (updatedConv) {
        // Always update to ensure message count is correct
        console.log(`🔄 Syncing selected conversation: ${updatedConv.messages.length} messages total`);
        setSelectedConversation(updatedConv);
      }
    }
  }, [conversations]);

  useEffect(() => {
    if (selectedConversation) {
      setReplyError(null);
    }
  }, [selectedConversation?.id]);

  // ✅ Auto-scroll to latest message when selected conversation changes
  useEffect(() => {
    if (selectedConversation && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedConversation?.messages.length]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      console.log("📸 Photo selected:", file.name);
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("⚠️ No file in input");
    }
  };

  const handlePostItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    // Debug logging
    console.log("📝 Form submission started");
    console.log("selectedFile state:", selectedFile);
    console.log("photoPreview exists:", !!photoPreview);
    
    const formData = new FormData();
    formData.append("title", (form.elements.namedItem("itemName") as HTMLInputElement)?.value || "Found Item");
    formData.append("location", (form.elements.namedItem("location") as HTMLInputElement)?.value || "Unknown");
    formData.append("description", (form.elements.namedItem("description") as HTMLInputElement)?.value || "");
    formData.append("category", "Accessories");

    // Use the selectedFile from state
    if (selectedFile) {
      console.log("📷 Uploading image:", selectedFile.name);
      formData.append("image", selectedFile);
    } else {
      console.log("⚠️ No image selected - selectedFile is:", selectedFile);
    }

    const token = localStorage.getItem("adminToken");

    try {
      const response = await axios.post("http://localhost:5000/found-items", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ Found item created successfully:", response.data);
      alert("Found item posted successfully!");
      setShowModal(false);
      setPhotoPreview(null);
      setSelectedFile(null);
      form.reset();

      // Re-fetch found items
      setLoading(true);
      const response2 = await axios.get("http://localhost:5000/found-items");
      const items = Array.isArray(response2.data.items) ? response2.data.items : [];
      console.log("📋 Updated found items list:", items);
      items.forEach((item: any, idx: number) => {
        console.log(`  Item ${idx}:`, {
          id: item.id,
          name: item.name || item.title,
          photo: item.photo,
          image: item.image
        });
      });
      setItems(items);
      setLoading(false);
    } catch (err: any) {
      console.error("❌ Error posting found item:", err.response?.data || err.message);
      alert("Error posting found item!");
    }
  }

  const handleLogout = async () => {
    try {
      // Clear admin session
      localStorage.removeItem("adminLoggedIn");
      localStorage.removeItem("adminStudentId");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminProfilePicture");
      localStorage.removeItem("adminConversations");
      
      // Dispatch logout event
      dispatchAdminLogoutEvent();
      
      // Redirect to login
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/admin/login");
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessageType("error");
      setPasswordMessage("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessageType("error");
      setPasswordMessage("New password and confirm password do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessageType("error");
      setPasswordMessage("Password must be at least 6 characters");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordMessageType("error");
      setPasswordMessage("New password must be different from current password");
      return;
    }

    try {
      const adminToken = localStorage.getItem("adminToken");
      const studentId = localStorage.getItem("adminStudentId");

      const response = await axios.post(
        "http://localhost:5000/auth/change-password",
        {
          studentId,
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      if (response.status === 200) {
        setPasswordMessageType("success");
        setPasswordMessage("Password changed successfully! Please login again.");
        
        // Clear password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Logout after 2 seconds
        setTimeout(() => {
          dispatchAdminLogoutEvent();
          router.push("/admin/login");
        }, 2000);
      }
    } catch (error: any) {
      setPasswordMessageType("error");
      setPasswordMessage(error.response?.data?.message || "Failed to change password");
      console.error("Password change error:", error);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setProfilePicture(imageData);
        localStorage.setItem("adminProfilePicture", imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendReply = async () => {
    const trimmedMessage = replyMessage.trim();
    if (!trimmedMessage || !selectedConversation) return;

    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      setReplyError("Session expired. Please log in again.");
      return;
    }

    setIsSendingReply(true);
    setReplyError(null);

    const conversationId = selectedConversation.id;

    let baselineConversations = conversations;
    let baselineSelected = baselineConversations.find((conv) => conv.id === conversationId) || null;

    if (!baselineSelected) {
      const refreshed = await fetchConversations();
      baselineConversations = refreshed || [];
      baselineSelected = baselineConversations.find((conv) => conv.id === conversationId) || null;
    }

    if (!baselineSelected) {
      setIsSendingReply(false);
      setReplyError("This conversation is no longer available. It may have been deleted by the user.");
      return;
    }

    const previousSelectedConversation = {
      ...baselineSelected,
      messages: [...baselineSelected.messages],
    };

    const previousConversations = baselineConversations.map((conv) => ({
      ...conv,
      messages: [...conv.messages],
    }));

    const messageId = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageTimestamp = new Date().toISOString();

    const optimisticMessage = {
      id: messageId,
      text: trimmedMessage,
      sender: "admin" as const,
      timestamp: messageTimestamp,
    };

    const updatedConversations = previousConversations.map((conv) => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          messages: [...conv.messages, optimisticMessage],
          lastMessage: trimmedMessage,
          lastMessageTime: messageTimestamp,
          unreadCount: 0,
        };
      }
      return conv;
    });

    const hasTargetConversation = updatedConversations.some((conv) => conv.id === conversationId);
    if (!hasTargetConversation) {
      setIsSendingReply(false);
      setReplyError("This conversation is no longer available. It may have been deleted by the user.");
      setReplyMessage(trimmedMessage);
      return;
    }

    setConversations(updatedConversations);
    const refreshedSelected = updatedConversations.find((conv) => conv.id === conversationId) || null;
    setSelectedConversation(refreshedSelected);
    setReplyMessage("");
    localStorage.setItem("adminConversations", JSON.stringify(updatedConversations));
    console.log("✅ Message added optimistically to UI");

    const newUnread = updatedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    setUnreadCount(newUnread);

    try {
      await axios.post(
        "http://localhost:5000/chat/message",
        {
          conversationId,
          content: trimmedMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      console.log("✅ Message sent to backend successfully");
    } catch (error: any) {
      console.error("Error sending reply to backend:", error);
      const statusCode = error.response?.status;

      if (statusCode === 400 || statusCode === 404) {
        console.warn("Conversation unavailable, rolling back optimistic message and refreshing state.");
        setReplyError(error.response?.data?.error || "Conversation is no longer available. Please refresh the inbox.");
        setReplyMessage(trimmedMessage);

        setConversations(previousConversations);
        localStorage.setItem("adminConversations", JSON.stringify(previousConversations));

        if (previousSelectedConversation) {
          setSelectedConversation(previousSelectedConversation);
        } else {
          setSelectedConversation(null);
        }

        const restoredUnread = previousConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        setUnreadCount(restoredUnread);

        try {
          await fetchConversations();
        } catch (refreshError) {
          console.error("Failed to refresh conversations after rollback:", refreshError);
        }

        return;
      }

      setReplyError(error.response?.data?.error || "Failed to send reply. Please try again.");
      setReplyMessage(trimmedMessage);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation
    
    if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return;
    }

    try {
      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        alert("Session expired. Please log in again.");
        return;
      }

      console.log(`🗑️ Attempting to delete conversation: ${conversationId}`);
      
      // Snapshot state before deletion (for potential rollback)
      const previousConversations = conversations.map(conv => ({
        ...conv,
        messages: [...conv.messages],
      }));

      // Optimistically remove from UI
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      setConversations(updatedConversations);
      localStorage.setItem("adminConversations", JSON.stringify(updatedConversations));

      // Clear selection if the deleted conversation was selected
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }

      try {
        // Call backend API to delete conversation
        await axios.delete(
          `http://localhost:5000/chat/conversation/${conversationId}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          }
        );

        console.log("✅ Conversation deleted successfully from backend");
      } catch (error: any) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;

          if (statusCode === 400 || statusCode === 404) {
            // Conversation already deleted or invalid - keep optimistic deletion
            console.warn(`Conversation not found on backend or already deleted (status ${statusCode}) - keeping optimistic deletion: ${errorMessage}`);
            return;
          }
          // Only log error for unexpected cases
          console.error(`❌ Backend delete failed (${statusCode}): ${errorMessage}`);

        // For other errors, rollback the optimistic deletion
        console.warn("Rolling back conversation deletion due to error");
        setConversations(previousConversations);
        localStorage.setItem("adminConversations", JSON.stringify(previousConversations));

        // Restore selection if we cleared it
        if (selectedConversation?.id === conversationId) {
          const restoredConversation = previousConversations.find(c => c.id === conversationId);
          if (restoredConversation) {
            setSelectedConversation(restoredConversation);
          }
        }

        alert(`Failed to delete conversation: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error("Error in handleDeleteConversation:", error);
      alert("An unexpected error occurred while deleting the conversation.");
    }
  };

  const handleMarkAsFound = async (itemId: string) => {
    const adminToken = localStorage.getItem("adminToken");
    if (!adminToken) {
      setFoundMessage({ type: "error", text: "Session expired. Please log in again." });
      return;
    }

    setMarkingAsFound(true);
    setFoundMessage(null);

    // Find the item in lostItems or activePostedItems to determine type
    const lostItem = lostItems.find(item => item.id === itemId);
    const foundItem = activePostedItems.find(item => item.id === itemId);
    const isLost = !!lostItem;
    const isFound = !!foundItem;

    let endpoint = "";
    if (isLost) {
      endpoint = `http://localhost:5000/lost-items/${itemId}/mark-as-found`;
    } else if (isFound) {
      endpoint = `http://localhost:5000/found-items/${itemId}/mark-as-claimed`;
    } else {
      setFoundMessage({ type: "error", text: "Item not found in admin lists." });
      setMarkingAsFound(false);
      return;
    }

    try {
      console.log(`🔄 Marking item as found/claimed: ${itemId}`);
      console.log(`📡 API Endpoint: PATCH ${endpoint}`);

      const response = await axios.patch(
        endpoint,
        {},
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      console.log("✅ Item marked as found/claimed successfully:", response.data);
      setFoundMessage({ 
        type: "success", 
        text: "Item marked as found successfully!" 
      });

      // Remove the item from the appropriate list
      if (isLost) {
        setLostItems(lostItems.filter(item => item.id !== itemId));
      } else if (isFound) {
        setItems(items.filter(item => item.id !== itemId));
      }

      // Clear selected item
      if (selectedLostItem?.id === itemId) {
        setSelectedLostItem(null);
      }
      if (selectedFoundItem?.id === itemId) {
        setSelectedFoundItem(null);
      }

      // Refetch items to ensure backend persistence
      if (isLost) {
        try {
          const refreshedResponse = await axios.get("http://localhost:5000/lost-items");
          const refreshedData = refreshedResponse.data.items || [];
          const refreshedActive = refreshedData.filter((item: any) => !item.isFound);
          setLostItems(refreshedActive);
          setStats((prev) => ({
            ...prev,
            lostItems: refreshedActive.length,
            totalReports: (prev.foundItems || 0) + refreshedActive.length,
          }));
        } catch (refetchError) {
          console.warn("⚠️ Could not refetch lost items:", refetchError);
        }
      } else if (isFound) {
        try {
          const refreshedResponse = await axios.get("http://localhost:5000/found-items");
          const refreshedData = refreshedResponse.data.items || [];
          setItems(refreshedData);
          setStats((prev) => ({
            ...prev,
            foundItems: refreshedData.length,
            totalReports: (prev.lostItems || 0) + refreshedData.length,
          }));
        } catch (refetchError) {
          console.warn("⚠️ Could not refetch found items:", refetchError);
        }
      }

      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setFoundMessage(null);
      }, 3000);

    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message ||
                      "Failed to mark item as found. Please try again.";

      console.error(`❌ Error marking item as found (${statusCode}):`, error.response?.data || error.message);
      if (statusCode === 404) {
        console.error("⚠️  Backend endpoint not found. The API route may not be implemented yet.");
        if (isLost) {
          console.error("📍 Expected endpoint: PATCH /lost-items/{itemId}/mark-as-found");
        } else if (isFound) {
          console.error("📍 Expected endpoint: PATCH /found-items/{itemId}/mark-as-claimed");
        }
        setFoundMessage({ 
          type: "error", 
          text: "Backend endpoint not found. The 'mark as found' feature may not be implemented yet." 
        });
      } else if (statusCode === 401) {
        setFoundMessage({ 
          type: "error", 
          text: "Authentication failed. Please log in again." 
        });
      } else if (statusCode === 400) {
        setFoundMessage({ 
          type: "error", 
          text: errorMsg 
        });
      } else {
        setFoundMessage({ 
          type: "error", 
          text: errorMsg 
        });
      }
    } finally {
      setMarkingAsFound(false);
    }
  };

  const handleMarkFoundItemAsClaimed = async (itemId: string) => {
    const adminToken = localStorage.getItem("adminToken");

    if (!adminToken) {
      setPostedItemMessage({ type: "error", text: "Session expired. Please log in again." });
      return;
    }

    setMarkingFoundItemId(itemId);
    setPostedItemMessage(null);

    try {
      console.log(`🔄 Marking found item as claimed: ${itemId}`);
      console.log(`📡 API Endpoint: PATCH http://localhost:5000/found-items/${itemId}/mark-as-claimed`);

      const response = await axios.patch(
        `http://localhost:5000/found-items/${itemId}/mark-as-claimed`,
        {},
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      console.log("✅ Found item marked as claimed successfully:", response.data);

      setItems((prevItems: any[]) =>
        prevItems.map((item: any) =>
          item.id === itemId
            ? {
                ...item,
                isFound: true,
                status: response.data?.item?.status ?? "claimed",
              }
            : item
        )
      );

      setSelectedFoundItem((prev: any | null) =>
        prev?.id === itemId
          ? {
              ...prev,
              isFound: true,
              status: response.data?.item?.status ?? prev.status,
            }
          : prev
      );

      setPostedItemMessage({
        type: "success",
        text: "Item marked as claimed successfully!",
      });

      // Refetch found items to ensure backend persistence
      console.log("🔄 Refetching found items to verify backend persistence...");
      try {
        const refreshedFound = await axios.get("http://localhost:5000/found-items");
        const refreshedItems = refreshedFound.data.items || [];
        setItems(refreshedItems);

        const foundWithPhotos = refreshedItems.filter((item: any) => item.image || item.photo).length;

        setStats((prev) => ({
          ...prev,
          foundItems: refreshedItems.length,
          totalReports: refreshedItems.length + (prev.lostItems || 0),
        }));

        setAnalytics((prev) => ({
          ...prev,
          foundWithPhotos,
          systemHealth:
            refreshedItems.length > 0
              ? Math.min(100, Math.round((foundWithPhotos / refreshedItems.length) * 100))
              : prev.systemHealth,
        }));
      } catch (refetchError) {
        console.warn("⚠️ Could not refetch found items:", refetchError);
      }

      setSelectedFoundItem(null);

      setTimeout(() => {
        setPostedItemMessage(null);
      }, 3000);
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to mark found item as claimed. Please try again.";

      console.error(
        `❌ Error marking found item as claimed (${statusCode}):`,
        error.response?.data || error.message
      );

      if (statusCode === 404) {
        setPostedItemMessage({
          type: "error",
          text: "Backend endpoint not found. The 'mark as claimed' feature may not be implemented yet.",
        });
      } else if (statusCode === 401) {
        setPostedItemMessage({
          type: "error",
          text: "Authentication failed. Please log in again.",
        });
      } else {
        setPostedItemMessage({
          type: "error",
          text: errorMsg,
        });
      }
    } finally {
      setMarkingFoundItemId(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <AdminSidebar
        conversations={conversations.map(c => ({
          id: c.id,
          foundItemId: c.foundItemId,
          itemName: c.itemName,
          userName: c.userName,
          lastMessage: c.lastMessage,
          lastMessageTime: c.lastMessageTime,
          unreadCount: c.unreadCount,
        }))}
        selectedConversation={selectedConversation ? {
          id: selectedConversation.id,
          foundItemId: selectedConversation.foundItemId,
          itemName: selectedConversation.itemName,
          userName: selectedConversation.userName,
          lastMessage: selectedConversation.lastMessage,
          lastMessageTime: selectedConversation.lastMessageTime,
          unreadCount: selectedConversation.unreadCount,
        } : null}
        onSelectConversation={(conv) => {
          const fullConv = conversations.find(c => c.id === conv.id);
          if (fullConv) {
            setSelectedConversation(fullConv);
            setShowInbox(true);
            setReplyError(null);
          }
        }}
        unreadCount={unreadCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-900 text-white font-sans selection:bg-blue-500/30 min-h-screen">
          {/* Global Background Effect */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[300px] w-[300px] rounded-full bg-amber-600 opacity-20 blur-[120px]"></div>
            <div className="absolute right-0 bottom-0 -z-10 h-[200px] w-[200px] rounded-full bg-orange-600 opacity-10 blur-[100px]"></div>
          </div>

          {/* Header */}
          <header className="bg-gray-800/40 backdrop-blur-md border-b border-white/10 sticky top-0">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xl font-bold overflow-hidden">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Admin" className="w-full h-full object-cover" />
                  ) : (
                    "👨‍💼"
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Admin Portal</h1>
                  <p className="text-xs text-gray-400">Lost & Found Management</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Notification Bell */}
                <button
                  aria-label="Open message inbox"
                  title="Open message inbox"
                  onClick={() => {
                    setShowInbox(!showInbox);
                    if (!showInbox) {
                      fetchConversations();
                    }
                  }}
                  className="relative p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Logout Button */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome, {adminName}!</h2>
              <p className="text-gray-400">Manage lost and found items, monitor reports, and oversee campus portal activities.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-all">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Total Reports</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalReports}</p>
                <div className="text-2xl mt-2">📋</div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-red-500/30 transition-all">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Lost Items</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.lostItems}</p>
                <div className="text-2xl mt-2">🔴</div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Found Items Posted</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.foundItems}</p>
                <div className="text-2xl mt-2">✅</div>
              </div>

              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all">
                <p className="text-sm text-gray-400 uppercase tracking-wide">Active Users</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.activeUsers}</p>
                <div className="text-2xl mt-2">👥</div>
              </div>
            </div>

            {/* Post Found Item Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:border-green-500/30 transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">✨</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Post Found Item</h3>
                    <p className="text-sm text-gray-400">Only admins can post found items</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-6 text-sm flex-1">Add items that have been found on campus and post them to help students reunite with their belongings.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold uppercase tracking-wide transition-all shadow-lg hover:shadow-green-500/20"
                >
                  Post Found Item
                </button>
              </div>

              {/* View Lost Items */}
              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:border-red-500/30 transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">🔴</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Lost Items</h3>
                    <p className="text-sm text-gray-400">{lostItems.length} reported</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-6 text-sm flex-1">View all lost items reported by users on campus. Help track and reunite items with their owners.</p>
                <button
                  onClick={() => setShowLostItems(!showLostItems)}
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold uppercase tracking-wide transition-all shadow-lg hover:shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  View Lost Items
                </button>
              </div>

              {/* View Posted Items */}
              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8 hover:border-blue-500/30 transition-all h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">📦</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Posted Items</h3>
                    <p className="text-sm text-gray-400">{activePostedItems.length} waiting to be claimed</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-6 text-sm flex-1">View all found items posted by admin. Track items waiting to be claimed by their owners.</p>
                <button
                  onClick={() => setShowFoundItems(!showFoundItems)}
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold uppercase tracking-wide transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  View Posted Items
                </button>
              </div>
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-6 hover:border-orange-500/30 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Quick Analytics</h3>
                  <div className="text-2xl">📊</div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">System Health</span>
                    <span className="text-green-400 font-bold">{analytics.systemHealth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Items with Photos</span>
                    <span className="text-cyan-400 font-bold">{analytics.foundWithPhotos + analytics.lostWithPhotos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Items per User</span>
                    <span className="text-orange-400 font-bold">{analytics.avgItemsPerUser}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {lostItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No recent activity yet. Lost items will appear here as users report them.</p>
                  </div>
                ) : (
                  lostItems.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🔴</div>
                        <div>
                          <p className="font-semibold text-white">
                            {item.user?.name || item.reportedBy || "User"} reported a lost {item.name || item.title}
                          </p>
                          <p className="text-xs text-gray-400">Location: {item.location || item.itemLastSeen || "Unknown"}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setShowLostItems(true);
                          setSelectedLostItem(item);
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 rounded hover:bg-gray-700/50 transition-all"
                      >
                        View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Post Found Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Post Found Item</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPhotoPreview(null);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide block mb-2">Item Name</label>
                  <input
                    type="text"
                    name="itemName"
                    placeholder="e.g., Blue Backpack"
                    required
                    className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide block mb-2">Location Found</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g., Library Area"
                    required
                    className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide block mb-2">Description</label>
                <textarea
                  name="description"
                  placeholder="Describe the found item in detail..."
                  rows={3}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-200 uppercase tracking-wide block mb-2">Upload Photo</label>
                {!photoPreview ? (
                  <>
                    <label htmlFor="photoInput" className="block cursor-pointer">
                      <div className="w-full border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-center">
                        <div className="text-2xl mb-2">📷</div>
                        <p className="text-sm text-gray-300 font-semibold">Click to upload photo</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </label>
                    <input
                      id="photoInput"
                      ref={fileInputRef}
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </>
                ) : (
                  <div className="relative group rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null);
                        setSelectedFile(null);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold transition-all"
                >
                  Post Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setPhotoPreview(null);
                    setSelectedFile(null);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lost Items Modal: Only show reported lost items */}
      {showLostItems && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gray-800/95 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl font-bold text-white">Lost Items</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {lostItems.length} item{lostItems.length !== 1 ? 's' : ''} reported lost
                </p>
              </div>
              <button
                onClick={() => {
                  setShowLostItems(false);
                  setSelectedLostItem(null);
                  setFoundMessage(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Success/Error Message */}
            {foundMessage && (
              <div
                className={`p-4 mx-6 mt-4 rounded-lg border ${
                  foundMessage.type === "success"
                    ? "bg-green-500/20 border-green-500/30 text-green-300"
                    : "bg-red-500/20 border-red-500/30 text-red-300"
                }`}
              >
                {foundMessage.type === "success" ? "✅" : "❌"} {foundMessage.text}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {lostItems.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-lg">No lost items right now</p>
                  <p className="text-sm">Lost items will appear here as they are reported</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {lostItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedLostItem(selectedLostItem?.id === item.id ? null : item)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer ${
                        selectedLostItem?.id === item.id
                          ? "bg-gray-700/50 border-red-500/50"
                          : "bg-gray-800/50 border-white/10 hover:border-red-500/30"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden border border-white/10 bg-gradient-to-br from-red-900/40 to-pink-900/40">
                          {item.photo || item.image ? (
                            <img
                              src={`http://localhost:5000${item.photo || item.image}`}
                              alt={item.name || item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🔴</div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600/30 text-red-300">Lost</span>
                            <h3 className="font-bold text-white text-lg">{item.name || item.title}</h3>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{item.description}</p>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500 font-semibold">Last Seen</p>
                              <p className="text-gray-300">{item.location || item.itemLastSeen || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Reported By</p>
                              <p className="text-gray-300">{item.user?.name || item.reportedBy || "Anonymous"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Date Reported</p>
                              <p className="text-gray-300">{new Date(item.createdAt || item.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Student ID</p>
                              <p className="text-gray-300">{item.user?.studentId || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedLostItem?.id === item.id && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Item ID</p>
                              <p className="text-gray-300 text-xs break-all">{item.id || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Full Description</p>
                              <p className="text-gray-300">{item.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Contact Information</p>
                              <p className="text-gray-300">Student ID: {item.user?.studentId || "N/A"}</p>
                              <p className="text-gray-300">Name: {item.user?.name || "N/A"}</p>
                            </div>
                            <button
                              onClick={() => handleMarkAsFound(item.id)}
                              disabled={markingAsFound}
                              className="w-full mt-3 py-2 px-4 rounded-lg bg-green-600/20 hover:bg-green-600/40 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 border border-green-500/30 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              {markingAsFound ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  Marking as Found...
                                </>
                              ) : (
                                <>
                                  ✅ Mark as Found
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posted Items Modal */}
      {showFoundItems && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gray-800/95 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl font-bold text-white">Posted Found Items</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {activePostedItems.length} item{activePostedItems.length !== 1 ? 's' : ''} waiting to be claimed
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFoundItems(false);
                  setSelectedFoundItem(null);
                  setPostedItemMessage(null);
                  setMarkingFoundItemId(null);
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Success/Error Message */}
            {postedItemMessage && (
              <div
                className={`p-4 mx-6 mt-4 rounded-lg border ${
                  postedItemMessage.type === "success"
                    ? "bg-green-500/20 border-green-500/30 text-green-300"
                    : "bg-red-500/20 border-red-500/30 text-red-300"
                }`}
              >
                {postedItemMessage.type === "success" ? "✅" : "❌"} {postedItemMessage.text}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {activePostedItems.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-lg">No unclaimed items right now</p>
                  <p className="text-sm">All posted items have been claimed. New posts will appear here.</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {activePostedItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedFoundItem(selectedFoundItem?.id === item.id ? null : item)}
                      className={`p-5 rounded-xl border transition-all cursor-pointer ${
                        selectedFoundItem?.id === item.id
                          ? "bg-gray-700/50 border-blue-500/50"
                          : "bg-gray-800/50 border-white/10 hover:border-blue-500/30"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-900/40 to-cyan-900/40 flex-shrink-0 overflow-hidden border border-white/10">
                          {item.photo || item.image ? (
                            <img
                              src={`http://localhost:5000${item.photo || item.image}`}
                              alt={item.name || item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("Image load error:", item.photo || item.image);
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg mb-1">{item.name || item.title}</h3>
                          <p className="text-sm text-gray-400 mb-2">{item.description}</p>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500 font-semibold">Location Found</p>
                              <p className="text-gray-300">{item.location || "Unknown"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Category</p>
                              <p className="text-gray-300">{item.category || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Posted By</p>
                              <p className="text-gray-300">{item.postedBy || item.user?.name || "Admin"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 font-semibold">Date Posted</p>
                              <p className="text-gray-300">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedFoundItem?.id === item.id && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Full Description</p>
                              <p className="text-gray-300">{item.description}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Additional Details</p>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                                <p><span className="text-gray-500">Location:</span> {item.location}</p>
                                <p><span className="text-gray-500">Category:</span> {item.category || "N/A"}</p>
                                <p><span className="text-gray-500">Posted:</span> {new Date(item.createdAt).toLocaleString()}</p>
                                <p><span className="text-gray-500">ID:</span> {item.id}</p>
                              </div>
                            </div>
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMarkAsFound(item.id);
                              }}
                              disabled={markingAsFound}
                              className={`w-full mt-3 py-2 px-4 rounded-lg border transition-colors text-sm font-semibold flex items-center justify-center gap-2 ${
                                markingAsFound
                                  ? "bg-green-600/20 border-green-500/30 text-green-200 cursor-wait"
                                  : "bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-500/30"
                              }`}
                            >
                              {markingAsFound ? "Marking as Found..." : "✅ Mark as Found"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gray-800/95 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl font-bold text-white">Message Inbox</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'No unread messages'}
                </p>
              </div>
              <button
                onClick={() => setShowInbox(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Conversations List */}
              <div className="w-80 border-r border-white/10 overflow-y-auto bg-gray-900/50">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`border-b border-white/5 hover:bg-gray-800/50 transition-colors ${
                        selectedConversation?.id === conv.id ? "bg-gray-800/80 border-l-2 border-l-green-500" : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedConversation(conv);
                          setReplyError(null);
                        }}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-semibold text-white truncate">{conv.itemName}</p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{conv.userName} ({conv.studentId})</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{conv.lastMessage}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </button>

                      {/* Three-dot menu */}
                      <div className="px-4 pb-2 flex justify-end">
                        <div className="relative">
                          <button
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpenId(dropdownOpenId === conv.id ? null : conv.id);
                            }}
                            aria-haspopup="true"
                            aria-expanded={dropdownOpenId === conv.id}
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400 hover:text-white" />
                          </button>
                          {/* Dropdown menu, open on click */}
                          {dropdownOpenId === conv.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-white/10 rounded-lg shadow-lg transition-all z-10">
                              <button
                                onClick={(e) => {
                                  handleDeleteConversation(conv.id, e);
                                  setDropdownOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors text-sm rounded-lg m-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Conversation
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-white/10 bg-gray-800/95">
                      <h3 className="font-bold text-white">{selectedConversation.itemName}</h3>
                      <p className="text-sm text-gray-400">
                        {selectedConversation.userName} - {selectedConversation.studentId}
                      </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-900/50">
                      {selectedConversation && selectedConversation.messages.length > 0 ? (
                        <>
                          {selectedConversation.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.sender === "admin" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom duration-300`}
                            >
                              <div className={`max-w-xs flex flex-col ${msg.sender === "admin" ? "items-end" : "items-start"}`}>
                                <p
                                  className={`text-xs font-semibold mb-1 ${
                                    msg.sender === "admin" ? "text-green-300" : "text-gray-400"
                                  }`}
                                >
                                  {msg.sender === "admin" ? "You (Admin)" : "User"}
                                </p>
                                <div
                                  className={`px-4 py-2 rounded-lg break-words ${
                                    msg.sender === "admin"
                                      ? "bg-green-600/30 text-green-100 border border-green-500/30 rounded-tr-none"
                                      : "bg-gray-700/50 text-gray-200 border border-gray-600/30 rounded-tl-none"
                                  }`}
                                >
                                  {msg.text}
                                </div>
                                <p
                                  className={`text-xs mt-1 text-gray-500`}
                                >
                                  {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                          No messages yet. Start the conversation!
                        </div>
                      )}
                    </div>

                    {/* Reply Input */}
                    <div className="p-4 border-t border-white/10 bg-gray-800/95">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && !isSendingReply && handleSendReply()}
                          disabled={isSendingReply}
                          placeholder="Type your reply..."
                          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm disabled:opacity-50"
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={isSendingReply || !replyMessage.trim()}
                          className="p-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" />
                          </svg>
                        </button>
                      </div>
                      {replyError && (
                        <p className="mt-2 text-xs text-red-400">
                          {replyError}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <p>Select a conversation to view messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Profile Settings</h3>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setPasswordMessage("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Profile Picture Section */}
            <div className="mb-8 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-4xl font-bold overflow-hidden mx-auto mb-4 border-4 border-white/10">
                {profilePicture ? (
                  <img src={profilePicture} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  "👨‍💼"
                )}
              </div>
              <p className="text-gray-300 font-semibold mb-3">{adminName}</p>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
                <span className="px-4 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 transition-colors text-sm font-semibold inline-block">
                  Change Picture
                </span>
              </label>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-white/10 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">Change Password</h4>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-200 block mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-200 block mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-200 block mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                  />
                </div>

                {/* Password Message */}
                {passwordMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm font-semibold ${
                      passwordMessageType === "success"
                        ? "bg-green-500/20 border border-green-500/30 text-green-300"
                        : "bg-red-500/20 border border-red-500/30 text-red-300"
                    }`}
                  >
                    {passwordMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold transition-all mt-4"
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Confirm Logout</h3>
              <p className="text-gray-400 mb-6">Are you sure you want to logout from the admin portal?</p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
