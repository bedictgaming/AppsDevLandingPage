# Backend Fix: Mark Found Item as Claimed

## Problem
The admin portal now calls `PATCH /found-items/{id}/mark-as-claimed` when an item has been handed back to its owner. Because the backend does not expose this route yet, the call returns a 404 ("Cannot PATCH /found-items/.../mark-as-claimed"), leaving the item visible to users.

## Goal
Add a backend endpoint that:
- Authenticates the admin performing the action.
- Marks the selected found item as claimed (`isFound = true`, `status = "claimed"`).
- Records metadata such as `claimedAt` and `claimedByAdminId` (if those columns exist; otherwise skip).
- Broadcasts a Pusher event so user dashboards update in real-time (optional but recommended).
- Returns the updated item so the frontend can refresh local state.

---

## Step 1 – Route Registration
**File:** `LOST-FOUND-BACKEND/src/routes/foundItem.routes.ts`

```typescript
import { authenticateAdmin } from "../middleware/auth.middleware"; // or whatever admin guard you use

router.patch(
  "/:id/mark-as-claimed",
  authenticateAdmin,
  foundItemController.markAsClaimed
);
```

Use your existing admin-auth middleware. If you only have a generic `authenticate`, add an explicit admin check inside the controller.

---

## Step 2 – Controller Handler
**File:** `LOST-FOUND-BACKEND/src/controllers/foundItem.controller.ts`

```typescript
markAsClaimed: async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedItem = await foundItemService.markAsClaimed(id, adminId);

    return res.status(200).json({
      message: "Found item marked as claimed",
      item: updatedItem,
    });
  } catch (error: any) {
    console.error("Error marking found item as claimed", error);

    const status = error.statusCode || error.status || 500;
    return res.status(status).json({
      error: error.message || "Failed to mark item as claimed",
    });
  }
},
```

Make sure `AuthRequest` exposes the decoded user/admin on `req.user`.

---

## Step 3 – Service Logic
**File:** `LOST-FOUND-BACKEND/src/services/foundItem.service.ts`

```typescript
import { NotFoundError, BadRequestError } from "../errors"; // adjust to your project

async markAsClaimed(foundItemId: string, adminId: string) {
  const item = await foundItemRepository.findById(foundItemId);
  if (!item) {
    throw new NotFoundError("Found item not found");
  }

  if (item.isFound || item.status === "claimed") {
    return item; // already claimed, no additional work required
  }

  const updatePayload: any = {
    isFound: true,
    status: "claimed",
  };

  if (item.claimedAt === undefined) {
    updatePayload.claimedAt = new Date();
  }

  if (item.claimedByAdminId !== undefined) {
    updatePayload.claimedByAdminId = adminId;
  }

  const updatedItem = await foundItemRepository.update(foundItemId, updatePayload);

  // Optional: notify clients via Pusher so the item disappears instantly from user views.
  try {
    await pusher.trigger("admin-found-items", "found-item-claimed", {
      id: updatedItem.id,
      status: updatedItem.status,
      isFound: updatedItem.isFound,
    });
  } catch (pusherError) {
    console.warn("Pusher notification for mark-as-claimed failed", pusherError);
  }

  return updatedItem;
}
```

Update the import paths to match your project layout. If you don’t track `claimedByAdminId` or `claimedAt`, just drop those fields from the payload.

---

## Step 4 – Repository Update
**File:** `LOST-FOUND-BACKEND/src/repositories/foundItem.repository.ts`

Add helpers if they do not exist yet:

```typescript
async findById(id: string) {
  return prisma.foundItem.findUnique({ where: { id } });
}

async update(id: string, data: Prisma.FoundItemUpdateInput) {
  return prisma.foundItem.update({ where: { id }, data });
}
```

If your repository already exposes similar methods, reuse them instead of duplicating logic.

---

## Step 5 – (Optional) Prisma Schema Touch-Up
If you want to capture who claimed the item and when, confirm the `FoundItem` model in `prisma/schema.prisma` includes fields such as:

```prisma
model FoundItem {
  id               String   @id @default(uuid())
  title            String
  description      String
  location         String
  image            String?
  status           String   @default("pending")
  isFound          Boolean  @default(false)
  claimedAt        DateTime?
  claimedByAdminId String?
  // ...other existing relations/fields...
}
```

If you add new columns, run a migration:

```bash
# Within the LOST-FOUND-BACKEND folder
npx prisma migrate dev --name add_claim_fields_to_found_item
```

---

## Step 6 – Verification Checklist
- [ ] Restart the backend API (`npm run dev` or your equivalent) so the new route loads.
- [ ] From the admin portal, repeat the "Mark as Claimed" action; you should now get a `200 OK` and the item should disappear from the "Posted Found Items" modal.
- [ ] Confirm the response payload includes the updated `item` object with `isFound: true` and `status: "claimed"` so the frontend state updates correctly.
- [ ] Watch the backend logs to ensure no errors are thrown and (if enabled) Pusher events fire successfully.

Once these steps are complete, the 404 will be resolved and the admin flow will behave as expected.
