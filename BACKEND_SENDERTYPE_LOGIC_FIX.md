# Backend Fix: Correct senderType Logic

## Problem
The current code determines `senderType` based on `isAdmin` flag:
```typescript
const senderType = message.sender.isAdmin ? "admin" : "user";
```

This is WRONG because:
- Regular users might have `isAdmin: false` (correct)
- BUT admin users will have `isAdmin: true` (marks all their messages as admin)
- We need to check if sender is the **conversation owner** instead

## Correct Logic

In `LOST-FOUND-BACKEND/src/controllers/chat.controller.ts`, update `sendMessage`:

**CHANGE FROM:**
```typescript
const senderType = message.sender.isAdmin ? "admin" : "user";
```

**CHANGE TO:**
```typescript
// Get the conversation to check who the original user is
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId },
});

if (!conversation) {
  return res.status(404).json({ error: "Conversation not found" });
}

// senderType = "user" if this is the original conversation creator
// senderType = "admin" if this is someone else responding
const senderType = conversation.userId === userId ? "user" : "admin";
```

## Why This Works
- ✅ If `userId` matches `conversation.userId` → This is the original user's message → "user"
- ✅ If `userId` doesn't match → This is admin or someone else responding → "admin"
- ✅ No need to rely on `isAdmin` flag
- ✅ Correctly distinguishes between user and admin messages in the conversation

## Complete Fixed sendMessage Function

```typescript
sendMessage: async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId || !content) {
      return res.status(400).json({ error: "Conversation ID and content are required" });
    }

    // Get conversation to determine senderType
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            isAdmin: true,
          },
        },
      },
    });

    // Determine senderType based on conversation ownership, not isAdmin flag
    const senderType = conversation.userId === userId ? "user" : "admin";

    await pusher.trigger(`conversation-${conversationId}`, "message-sent", {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      senderType,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        isAdmin: message.sender.isAdmin,
      },
    });

    return res.status(201).json({
      message: "Message sent",
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        createdAt: message.createdAt,
        senderType,
        sender: message.sender,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
},
```

This ensures:
- User messages have `senderType: "user"` ✅
- Admin replies have `senderType: "admin"` ✅
- No more mislabeling ✅
