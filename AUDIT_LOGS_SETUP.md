# Audit Logs Setup Instructions

## Database Setup

To enable audit logs in your application, you need to create the audit_logs table in your PostgreSQL database.

### Step 1: Run the Migration Script

Execute the SQL migration script to create the audit_logs table:

```bash
psql -U postgres -d itsd -f create-audit-logs-table.sql
```

This will:
- Create the `itsd_schema.audit_logs` table if it doesn't exist
- Create indexes for faster queries
- Insert sample audit log data for testing

### Step 2: Verify the Table

After running the migration, verify the table was created:

```bash
psql -U postgres -d itsd
```

Then run:

```sql
SELECT * FROM itsd_schema.audit_logs ORDER BY created_at DESC LIMIT 10;
```

## Audit Logging Features

### Login Tracking
When users login or fail to login, the system automatically records:
- **Action**: LOGIN (successful) or LOGIN_FAILED (failed attempt)
- **User Email**: The email address that attempted to login
- **Description**: Details about the login event
- **Timestamp**: Automatically recorded

### Viewing Audit Logs

1. Go to Admin Panel
2. Click "Audit Logs" in the sidebar
3. View all recorded events with:
   - Action type (color-coded)
   - User email
   - Description
   - Timestamp
   - Search and filter capabilities

### API Endpoints

#### Record Audit Log
```
POST /api/auth/record-audit
Content-Type: application/json

{
  "action": "LOGIN",
  "user_email": "user@example.com",
  "user_role": "User",
  "description": "User logged in successfully"
}
```

#### Fetch Audit Logs
```
GET /api/auth/audit-logs
```

Returns array of all audit logs ordered by timestamp (newest first).

## Troubleshooting

### Audit logs table doesn't exist
Run the migration script:
```bash
psql -U postgres -d itsd -f create-audit-logs-table.sql
```

### No audit logs appearing in Admin
1. Check that the database migration was applied
2. Restart the Node.js server
3. Login again to generate new audit log entries
4. Refresh the Audit Logs page in Admin

### Permission denied error
Make sure you're using the correct PostgreSQL user (postgres) and have proper permissions to the itsd database.

## Color Coding in Audit Logs

- **Green (#10b981)**: USER_CREATED - Successful user creation
- **Blue (#3b82f6)**: USER_UPDATED - User information updated
- **Purple (#8b5cf6)**: LOGIN - Successful login
- **Red (#ef4444)**: LOGIN_FAILED, USER_DELETED - Failed/destructive actions
- **Gray (#6b7280)**: LOGOUT, other system events
- **Orange (#f59e0b)**: ROLE_CHANGED - Role modifications
- **Pink (#ec4899)**: PERMISSION_CHANGED - Permission modifications

## Future Enhancements

Audit logs can be expanded to track:
- User creation/deletion events
- Role and permission changes
- Data modifications
- Logout events
- Failed security attempts
- Administrative actions
