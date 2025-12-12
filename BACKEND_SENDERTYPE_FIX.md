# Backend Fix: Add senderType to Messages

## Problem
User messages are being labeled as "Admin Response" because the backend doesn't distinguish who sent the message (original user vs admin replying).

## Solution: Add senderType Field

### Step 1: Update Prisma Schema

Edit `LOST-FOUND-BACKEND/prisma/schema.prisma`:

```prisma
model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id], onDelete: Cascade)
  content        String
  senderType     String       @default("user") // "user" or "admin" - WHO sent the message
  createdAt      DateTime     @default(now())

  @@index([conversationId])
  @@index([senderId])
}
```

### Step 2: Create Migration

Run in `LOST-FOUND-BACKEND` folder:

```bash
npx prisma migrate dev --name add_sender_type_to_messages
```

### Step 3: Update chat.service.ts

In `src/service/chat.service.ts`, update `sendMessage()`:

```typescript
async sendMessage(conversationId: string, senderId: string, content: string) {
  if (!content || content.trim().length === 0) {
    throw new Error("Message cannot be empty");
  }

  const conversation = await conversationRepository.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  // Determine sender type:
  // - If senderId === conversation.userId → "user" (original message creator)
  // - Otherwise → "admin" (admin responding)
  const senderType = conversation.userId === senderId ? "user" : "admin";

  return await messageRepository.create({
    conversationId,
    senderId,
    content: content.trim(),
    senderType, // ← Add this
  });
}
```

### Step 4: Update chat.controller.ts

In `src/controllers/chat.controller.ts`, update the Pusher event:

```typescript
sendMessage: async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, content } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Save message to database
    const message = await chatService.sendMessage(conversationId, userId, content);

    // Trigger Pusher event with senderType
    await pusher.trigger(
      `conversation-${conversationId}`,
      "message-sent",
      {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderType: message.senderType, // ← Add this
        content: message.content,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          name: message.sender.name,
        },
      }
    );

    // Notify admin of new message
    await pusher.trigger('admin-notifications', 'new-message', {
      conversationId: message.conversationId,
      messageId: message.id,
      content: message.content,
      senderName: message.sender.name,
      senderType: message.senderType,
      timestamp: message.createdAt,
    });

    res.status(201).json({
      message: "Message sent",
      data: message,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
},
```

## Summary

After these changes:
- ✅ User messages will have `senderType: "user"`
- ✅ Admin responses will have `senderType: "admin"`
- ✅ Frontend can use this to display correctly
- ✅ No more duplicate or misidentified messages
