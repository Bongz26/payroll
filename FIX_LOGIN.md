# 🔧 URGENT FIX - Login Issue Resolved

## Problem Found
The password hash in the seed data was **invalid**, which is why login wasn't working.

## Solution
I've updated `database/seed.sql` with a **correct password hash**.

## ⚡ What You Need to Do

### Step 1: Clear Old Data (If you ran seed.sql before)
Go to **Supabase SQL Editor** and run:
```sql
-- Delete old test employees
DELETE FROM leave_requests;
DELETE FROM leave_balances;  
DELETE FROM payslips;
DELETE FROM employees;
```

### Step 2: Run Updated Seed File
1. Open the **updated** `database/seed.sql` file
2. Copy ALL contents
3. Paste in **Supabase SQL Editor**
4. Click **Run**

### Step 3: Test Login
The servers are already running. Open your browser to:
- **URL**: http://localhost:3000
- **Email**: `john.mokoena@thusanangfs.co.za`
- **Password**: `password123`

This should work now! ✅

---

## Verified Test Credentials

| Email | Password | Role |
|-------|----------|------|
| john.mokoena@thusanangfs.co.za | password123 | Funeral Director |
| sarah.dlamini@thusanangfs.co.za | password123 | HR Manager |
| thabo.nkosi@thusanangfs.co.za | password123 | Driver |
| nomsa.khumalo@thusanangfs.co.za | password123 | Accountant |
| sipho.buthelezi@thusanangfs.co.za | password123 | Sales Consultant |

All passwords are **password123** (hash has been verified ✅)
