import PusherJS from 'pusher-js';

export const pusherClient = new PusherJS(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
);

// Enable debug logging for Pusher
if (typeof window !== 'undefined') {
  PusherJS.logToConsole = true;
  console.log("Pusher initialized with Key:", process.env.NEXT_PUBLIC_PUSHER_KEY, "Cluster:", process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
  
  // Listen for connection events
  pusherClient.connection.bind('connected', () => {
    console.log("✅ Pusher connected");
  });
  
  pusherClient.connection.bind('error', (error: any) => {
    console.error("❌ Pusher connection error:", error);
  });
  
  pusherClient.connection.bind('disconnected', () => {
    console.log("⚠️ Pusher disconnected");
  });
}

export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: any) => void
) {
  const channelName = `conversation-${conversationId}`;
  
  // First, unsubscribe from any previous subscription to this channel
  // This prevents duplicate callbacks from stacking up
  pusherClient.unsubscribe(channelName);
  console.log(`🧹 Unsubscribed from previous ${channelName} subscription`);
  
  // Now create a fresh subscription
  const channel = pusherClient.subscribe(channelName);
  console.log(`✅ Created new Pusher subscription for ${channelName}`);
  
  // Listen for the "message-sent" event that backend sends
  const messageHandler = (data: any) => {
    console.log("Pusher message received:", data);
    onMessage(data);
  };
  
  channel.bind('message-sent', messageHandler);

  return () => {
    console.log(`🧹 Unsubscribing from ${channelName}`);
    pusherClient.unsubscribe(channelName);
  };
}

// Subscribe to admin notifications for new conversations
export function subscribeToAdminNotifications(
  onNewConversation: (data: any) => void
) {
  console.log("Setting up admin notifications listener...");
  const channel = pusherClient.subscribe('admin-notifications');
  
  channel.bind('new-message', (data: any) => {
    console.log("🔔 New message notification for admin:", data);
    onNewConversation(data);
  });
  
  channel.bind('pusher:subscription_succeeded', () => {
    console.log("✅ Successfully subscribed to admin-notifications channel");
  });
  
  channel.bind('pusher:subscription_error', (error: any) => {
    console.error("❌ Failed to subscribe to admin-notifications:", error);
  });

  return () => {
    channel.unbind('new-message', onNewConversation);
    pusherClient.unsubscribe('admin-notifications');
  };
}

// Trigger a message sent event on the conversation channel (client-side only, for demo)
export function triggerMessageEvent(
  conversationId: string,
  messageData: {
    id: string;
    content: string;
    sender: 'user' | 'admin';
    timestamp: string;
    senderId?: string; // Add optional senderId for proper identification
  }
) {
  // This uses Pusher's client-side triggering for demo purposes
  // In production, this would be done server-side
  const channel = pusherClient.channel(`conversation-${conversationId}`);
  
  if (channel) {
    // Manually trigger the event for all subscribers
    console.log("📤 Triggering message event:", messageData);
    (channel as any).emit('message-sent', messageData);
  }
}

// Trigger admin notification event
export function triggerAdminNotification(data: any) {
  const channel = pusherClient.channel('admin-notifications');
  if (channel) {
    console.log("📢 Triggering admin notification:", data);
    (channel as any).emit('new-message', data);
  }
}

// Subscribe to lost items updates (for real-time removal when admin marks items as found)
export function subscribeToLostItemsUpdates(
  onItemMarkedFound: (data: any) => void
) {
  console.log("🔌 Subscribing to 'lost-items-updates' channel...");
  const channel = pusherClient.subscribe('lost-items-updates');
  
  channel.bind('pusher:subscription_succeeded', () => {
    console.log("✅ Successfully subscribed to lost-items-updates channel");
    console.log(`📡 Listening for 'item-marked-found' events on this channel`);
  });
  
  channel.bind('pusher:subscription_error', (error: any) => {
    console.error("❌ Failed to subscribe to lost-items-updates:", error);
  });
  
  channel.bind('item-marked-found', (data: any) => {
    console.log("🎉 ========== RECEIVED PUSHER EVENT ==========");
    console.log("🔔 Event: item-marked-found");
    console.log("📦 Data:", data);
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("✨ Calling handler with data");
    onItemMarkedFound(data);
  });

  return () => {
    console.log("🧹 Unsubscribing from lost-items-updates channel");
    channel.unbind('item-marked-found', onItemMarkedFound);
    pusherClient.unsubscribe('lost-items-updates');
  };
}
