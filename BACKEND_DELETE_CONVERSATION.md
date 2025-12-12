# Fix: Implement DELETE Conversation Endpoint

## Problem
Frontend is calling `DELETE /chat/conversation/{conversationId}` but this endpoint doesn't exist on the backend, resulting in a 404 error.

## Solution

You need to add a DELETE endpoint to your chat controller and routes.

### 1. Update `chat.controller.ts`

Add this method to your chat controller:

```typescript
async deleteConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;
    const adminToken = req.headers.authorization?.split(" ")[1];

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
    }

    // Verify admin authentication
    if (!adminToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify user is admin/authenticated
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || "your-secret-key");
      // User is authenticated as admin
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Delete the conversation (will cascade delete messages due to onDelete: Cascade)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return res.status(200).json({ 
      message: "Conversation deleted successfully",
      conversationId 
    });
  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    return res.status(500).json({ 
      message: "Failed to delete conversation",
      error: error.message 
    });
  }
}
```

### 2. Update `chat.router.ts` or your routes file

Add this DELETE route:

```typescript
// Add this to your chat routes
router.delete(
  "/conversation/:conversationId",
  authMiddleware, // Make sure user is authenticated
  async (req: Request, res: Response) => {
    await chatController.deleteConversation(req, res);
  }
);
```

If you're using Express app.delete directly:

```typescript
app.delete(
  "/chat/conversation/:conversationId",
  authMiddleware,
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    // ... implementation
  }
);
```

### 3. Complete Simple Implementation

If you want a complete, simpler version without JWT verification (if already handled by middleware):

```typescript
// In chat.controller.ts
async deleteConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.params;

    // Delete the conversation and all related messages
    const deleted = await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return res.status(200).json({ 
      message: "Conversation deleted successfully",
      conversationId: deleted.id 
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return res.status(500).json({ 
      message: "Failed to delete conversation",
      error: error.message 
    });
  }
}

// In routes file
router.delete(
  "/conversation/:conversationId",
  authMiddleware,
  chatController.deleteConversation.bind(chatController)
);
```

## What This Does

- ✅ Adds a DELETE endpoint at `/chat/conversation/{conversationId}`
- ✅ Verifies the user is authenticated
- ✅ Deletes the conversation from the database
- ✅ Cascade deletes all messages associated with the conversation
- ✅ Returns appropriate error messages (404 if not found, 401 if unauthorized, 500 if server error)

## Frontend is Already Prepared

The frontend code in `/app/admin/portal/page.tsx` already has the `handleDeleteConversation` function that:
- Calls `DELETE /chat/conversation/{conversationId}`
- Removes the conversation from state and localStorage
- Shows confirmation dialog
- Handles errors gracefully

## Testing

After implementing the endpoint:

1. Open admin portal
2. Click the three-dot menu on a conversation
3. Click "Delete"
4. Confirm deletion
5. The conversation should be removed from the list
