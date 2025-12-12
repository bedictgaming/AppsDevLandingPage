"use client";

import { useState } from "react";
import { ChevronDown, Search, MessageSquare, Bell } from "lucide-react";

interface SidebarConversation {
  id: string;
  foundItemId: string;
  itemName: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface AdminSidebarProps {
  conversations: SidebarConversation[];
  selectedConversation: SidebarConversation | null;
  onSelectConversation: (conversation: SidebarConversation) => void;
  unreadCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  conversations,
  selectedConversation,
  onSelectConversation,
  unreadCount,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [_isCollapsed, setIsCollapsed] = useState(isCollapsed);

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleCollapse = () => {
    const newState = !_isCollapsed;
    setIsCollapsed(newState);
    onToggleCollapse?.(newState);
  };

  if (_isCollapsed) {
    return (
      <div className="w-16 bg-gradient-to-b from-blue-900 to-blue-800 border-r border-blue-700 flex flex-col items-center py-4 gap-4 h-screen sticky top-0">
        <button
          onClick={handleToggleCollapse}
          className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          title="Expand"
        >
          <ChevronDown className="w-5 h-5 text-white rotate-90" />
        </button>

        <div className="relative">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            💬
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 bg-gradient-to-b from-blue-900 to-blue-800 border-r border-blue-700 flex flex-col h-screen sticky top-0 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-200" />
            <h2 className="text-xl font-bold text-white">Messages</h2>
          </div>
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors"
            title="Collapse"
          >
            <ChevronDown className="w-5 h-5 text-white -rotate-90" />
          </button>
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 mb-4 bg-red-500/20 border border-red-400/30 rounded-lg p-2">
            <Bell className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-200">
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-blue-700/50 border border-blue-600 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-800">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-blue-300 text-sm">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          <div className="divide-y divide-blue-700">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`w-full p-4 text-left transition-all duration-200 ${
                  selectedConversation?.id === conversation.id
                    ? "bg-blue-700 border-l-4 border-blue-400"
                    : "hover:bg-blue-800/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white truncate">
                      {conversation.userName}
                    </h3>
                    <p className="text-xs text-blue-300 truncate">
                      {conversation.itemName}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2 flex-shrink-0">
                      {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-200 truncate">
                  {conversation.lastMessage}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  {conversation.lastMessageTime}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-blue-700 bg-blue-900/50">
        <p className="text-xs text-blue-400 text-center">
          {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
        </p>
      </div>
    </aside>
  );
}
