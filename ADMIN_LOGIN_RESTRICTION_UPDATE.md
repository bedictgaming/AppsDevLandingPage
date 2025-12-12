# Admin Login Restriction Implementation Guide

## Overview
This document outlines the frontend changes made to restrict admin accounts from logging in through the user login endpoint. The backend needs to be updated to support these restrictions.

## Frontend Changes Made

### 1. LoginModal Component (`/components/loginModal.tsx`)
**Updated to:**
- Send `type: "user"` parameter in login request
- Check response for `isAdmin` or `type: "admin"` fields
- Redirect admin accounts to `/admin/login` with an error message
- Handle 403 Forbidden responses that indicate admin account detected

**Frontend Code:**
```typescript
const response = await axios.post("http://localhost:5000/auth/login", {
  studentId: studentId.trim(),
  password: password,
  type: "user", // NEW: Specify that this is a user login attempt
});

// Check if the account is an admin trying to use user login
if (response.data.isAdmin || response.data.type === "admin") {
  setError("Admin accounts must log in through the admin portal. Redirecting...");
  setTimeout(() => {
    window.location.href = "/admin/login";
  }, 2000);
  return;
}
```

### 2. Admin Login Page (`/app/admin/login/page.tsx`)
**Updated to:**
- Send `type: "admin"` parameter in login request
- Check response for account type validation
- Reject regular user accounts from accessing admin portal
- Redirect users to home page if they try to access admin portal with user credentials

**Frontend Code:**
```typescript
const response = await axios.post("http://localhost:5000/auth/login", {
  studentId: studentId.trim(),
  password: password,
  type: "admin", // NEW: Specify that this is an admin login attempt
});

// Check if the account is a regular user trying to use admin login
if (!response.data.isAdmin && response.data.type !== "admin") {
  setError("Only admin accounts can access the admin portal. Redirecting...");
  setTimeout(() => {
    window.location.href = "/";
  }, 2000);
  return;
}
```

## Backend Changes Required

### Database Schema Update
The backend needs to distinguish between admin and regular user accounts. Add a role/type field to the User table:

```sql
-- Add to User table (if not already exists)
ALTER TABLE User ADD COLUMN role VARCHAR(50) DEFAULT 'user';
-- Values: 'user' or 'admin'
```

Or in Prisma schema (if using Prisma):
```prisma
model User {
  id        String   @id @default(cuid())
  studentId String   @unique
  password  String
  role      String   @default("user")  // 'user' or 'admin'
  // ... other fields
}
```

### Authentication Endpoint Updates
Update the `/auth/login` endpoint to:

1. **Accept `type` parameter** from request body
2. **Validate account role against login type**
3. **Return role information** in response
4. **Reject mismatched login attempts** with 403 Forbidden

**Pseudocode:**
```javascript
POST /auth/login
{
  studentId: string,
  password: string,
  type: "user" | "admin"  // NEW: Required parameter
}

Logic:
1. Find user by studentId
2. Verify password matches
3. Check user.role against request.body.type
   - If type === "user" and user.role === "admin":
     → Return 403 error: "Admin accounts must use admin portal"
   - If type === "admin" and user.role === "user":
     → Return 403 error: "Only admin accounts can access admin portal"
   - If types match:
     → Generate JWT token
     → Return token + user data with isAdmin flag

Response (Success):
{
  token: string,
  isAdmin: boolean,
  type: "user" | "admin",
  studentId: string,
  // ... other user data
}

Response (Error - Account Type Mismatch):
{
  error: "Forbidden",
  message: "Admin accounts must use admin portal" | "Only admin accounts can access admin portal",
  status: 403
}
```

### Validation Logic Example (Node.js/Express):
```javascript
app.post("/auth/login", async (req, res) => {
  const { studentId, password, type } = req.body;

  if (!type || !["user", "admin"].includes(type)) {
    return res.status(400).json({ error: "Invalid login type" });
  }

  try {
    const user = await User.findUnique({ where: { studentId } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // CRITICAL: Check if role matches login type
    if (type === "user" && user.role === "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Admin accounts must use admin portal" 
      });
    }

    if (type === "admin" && user.role !== "admin") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only admin accounts can access admin portal" 
      });
    }

    // Generate token and return success
    const token = jwt.sign({ studentId: user.studentId }, JWT_SECRET);
    res.json({
      token,
      isAdmin: user.role === "admin",
      type: user.role,
      studentId: user.studentId
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});
```

## Implementation Checklist

- [ ] Add `role` field to User table in database
- [ ] Update Prisma schema (if applicable) with role field
- [ ] Run database migration
- [ ] Update `/auth/login` endpoint to:
  - [ ] Accept `type` parameter
  - [ ] Validate role against login type
  - [ ] Return 403 for role mismatches
  - [ ] Return `isAdmin` and `type` in response
- [ ] Test user login with user credentials
- [ ] Test admin login with admin credentials
- [ ] Test user trying to access admin login (should redirect)
- [ ] Test admin trying to access user login (should redirect)

## Testing Scenarios

### Scenario 1: User Login with User Credentials
- Navigate to home page
- Click Login button
- Enter user student ID and password
- Result: Should redirect to `/dashboard`

### Scenario 2: User Login with Admin Credentials
- Navigate to home page
- Click Login button
- Enter admin student ID and password
- Result: Should show error "Admin accounts must log in through the admin portal" and redirect to `/admin/login`

### Scenario 3: Admin Login with Admin Credentials
- Navigate to `/admin/login`
- Enter admin student ID and password
- Result: Should redirect to `/admin/portal`

### Scenario 4: Admin Login with User Credentials
- Navigate to `/admin/login`
- Enter user student ID and password
- Result: Should show error "Only admin accounts can access the admin portal" and redirect to home page

## Security Notes

1. **Role Assignment:** Ensure admin roles are only assigned through secure administrative channels
2. **Token Validation:** Verify tokens still include role information for authorization
3. **Email Verification:** Consider adding email verification for admin account creation
4. **Audit Logging:** Log all login attempts, especially failed ones
5. **Rate Limiting:** Implement rate limiting on login endpoint to prevent brute force attacks

## Files Modified

- **Frontend:**
  - `/components/loginModal.tsx` - Added type parameter and admin detection
  - `/app/admin/login/page.tsx` - Added type parameter and user account rejection

- **Backend (TO BE UPDATED):**
  - `/auth/login` endpoint - Add role validation
  - User database schema - Add role field
  - Any related middleware - Update to check role

## Questions?

If there are issues with the implementation, check:
1. Database migration applied successfully
2. User/admin accounts have correct role assigned
3. Backend returning `isAdmin` and `type` fields in response
4. Response 403 status code is properly set for mismatches
