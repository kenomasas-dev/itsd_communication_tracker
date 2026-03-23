# Admin Login Database Setup Guide

## What Was Created

### 1. New Database Table: `adminlogin`
Location: `c:\MyProject\create-adminlogin-table.sql`

**Table Structure:**
- `id` - Serial primary key
- `name` - Admin name (required)
- `email` - Email address (unique, required)
- `password` - Hashed password
- `role` - Always 'Admin' (CHECK constraint enforces this)
- `department` - Department name
- `phone` - Phone number
- `notes` - Additional notes
- `permissions` - JSON array of permissions
- `is_active` - Boolean flag for activation/deactivation
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Features:**
- ✅ Role is locked to 'Admin' (cannot be changed)
- ✅ Includes `is_active` column (deactivation support)
- ✅ Indexes on email and is_active for performance
- ✅ Includes sample admin user (superadmin@itsd.com)

### 2. New Backend Routes: Admin Auth Module
Location: `c:\MyProject\my-app\src\routes\admin-auth.js`

**Endpoints:**
- `POST /api/admin-auth/admin-login` - Admin login (checks Admin role + is_active)
- `GET /api/admin-auth/admin-users` - Get all admin users
- `POST /api/admin-auth/admin-users` - Create new admin user
- `PUT /api/admin-auth/admin-users/:id/toggle-status` - Activate/deactivate admin
- `DELETE /api/admin-auth/admin-users/:id` - Delete admin user

### 3. Admin Login Component
Location: `c:\MyProject\my-app\src\Admin\AdminLogin.js` (already created)

## Setup Instructions

### Step 1: Run Database Migration
```powershell
psql -U postgres -d itsd -f "c:\MyProject\create-adminlogin-table.sql"
```

This creates the `adminlogin` table and inserts a sample admin user:
- Email: `superadmin@itsd.com`
- Password: `password123`
- Role: `Admin` (locked)
- Status: Active

### Step 2: Update Server.js
Edit `c:\MyProject\my-app\server.js` and add:

```javascript
const adminAuthRoutes = require('./src/routes/admin-auth');
```

And in the routes section add:
```javascript
app.use('/api/admin-auth', adminAuthRoutes);
```

### Step 3: Update AdminLogin Component (Optional)
If you want to use the separate adminlogin table, update `AdminLogin.js` endpoint:

```javascript
// Change from:
const response = await fetch('http://localhost:5000/api/auth/login', {

// To:
const response = await fetch('http://localhost:5000/api/admin-auth/admin-login', {
```

### Step 4: Restart Backend Server
```powershell
# Stop current server (Ctrl+C)
cd c:\MyProject\my-app
node server.js
```

## Admin Login Verification

The admin login checks:
1. ✅ Email and password match in `adminlogin` table
2. ✅ Admin account is active (`is_active = true`)
3. ✅ Role is exactly 'Admin'
4. ✅ Records login in audit logs

## Admin User Management

### Create New Admin User
```powershell
curl -X POST http://localhost:5000/api/admin-auth/admin-users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@admin.com",
    "password": "securepass123",
    "department": "IT",
    "permissions": ["Full Access", "User Management"]
  }'
```

### Get All Admin Users
```powershell
curl http://localhost:5000/api/admin-auth/admin-users
```

### Activate/Deactivate Admin
```powershell
curl -X PUT http://localhost:5000/api/admin-auth/admin-users/1/toggle-status
```

### Delete Admin User
```powershell
curl -X DELETE http://localhost:5000/api/admin-auth/admin-users/1
```

## Security Features

✅ Separate admin table - only Admin users
✅ Role locked to 'Admin' - cannot be changed
✅ Active/Inactive status - can deactivate admins
✅ Password protected - required for login
✅ Audit logging - all admin logins recorded
✅ Email uniqueness - prevents duplicate admins
✅ Permissions support - granular admin permissions

## Database Difference

### Regular User Table (`login`)
- Role can be: Admin, Staff, Viewer, User, etc.
- Anyone with valid credentials can login

### Admin Table (`adminlogin`)
- Role MUST be: Admin (enforced by CHECK constraint)
- Only admins can login
- Separate authentication flow
- Only admins can manage other admins
