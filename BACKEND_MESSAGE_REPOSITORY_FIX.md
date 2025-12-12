# Fix: Include senderType in Message Repository

## Problem
The `getMessages` endpoint returns messages without `senderType`, so existing messages can't be properly labeled as "user" or "admin".

## Required Changes

### 1. Update `message.repository.ts`

The `findByConversationId` method needs to include the conversation data to determine `senderType`:

```typescript
import { prisma } from "../prisma/client";

export const messageRepository = {
  create: (data: { conversationId: string; senderId: string; content: string }) => {
    return prisma.message.create({
      data,
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  },

  findByConversationId: async (conversationId: string) => {
    // Get conversation first to know who the original user is
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Get all messages with sender info
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Add senderType based on conversation ownership
    return messages.map((msg) => ({
      ...msg,
      senderType: msg.senderId === conversation.userId ? "user" : "admin",
    }));
  },

  findById: (id: string) => {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });
  },
};
```

### 2. Update `chat.service.ts` `getMessages`

The service should return messages with senderType:

```typescript
async getMessages(conversationId: string) {
  return await messageRepository.findByConversationId(conversationId);
  // Now returns messages with senderType included
},
```

## What This Does
- ✅ When frontend calls GET `/chat/messages/:conversationId`
- ✅ Messages come back with `senderType: "user"` or `senderType: "admin"`
- ✅ Frontend can properly label them as "You" or "Admin Response"
- ✅ No more mislabeled messages

## Complete message.repository.ts Example

See the code block above for the complete implementation.
