# 🚀 Quick Setup Guide - Next Steps

## ✅ Step 1: Database Schema - COMPLETED
You've already run the schema in Supabase.

## 📝 Step 2: Load Sample Data

The seed file is ready with password hashes. Now run it in Supabase:

### Instructions:
1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project (**kdqsgawptgivkascmydt**)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. **Copy the entire contents** of: `database/seed.sql`
6. **Paste** into the SQL editor
7. Click **Run** (or press F5)

### What This Does:
- Creates 5 test employees (all password: `password123`)
- Adds sample payslips for January and December
- Sets up leave balances for 2026
- Creates sample leave requests (approved, pending)

### Test Employee Credentials:
After running, you can login with any of these:

| Email | Password | Role |
|-------|----------|------|
| john.mokoena@thusanang.co.za | password123 | Funeral Director |
| sarah.dlamini@thusanang.co.za | password123 | HR Manager |
| thabo.nkosi@thusanang.co.za | password123 | Driver |
| nomsa.khumalo@thusanang.co.za | password123 | Accountant |
| sipho.buthelezi@thusanang.co.za | password123 | Sales Consultant |

---

## 🎯 Step 3: Start the Application

Once you've loaded the sample data, run both servers:

### Option 1: Start Both Together (Recommended)
```bash
cd C:\Users\Bongz\Documents\WORK\SYSTEM\Payroll
npm run dev
```

### Option 2: Start Separately

**Terminal 1 - Backend:**
```bash
cd C:\Users\Bongz\Documents\WORK\SYSTEM\Payroll
npm run server
```

**Terminal 2 - Frontend:**
```bash
cd C:\Users\Bongz\Documents\WORK\SYSTEM\Payroll
npm run client
```

---

## 🌐 Step 4: Open and Test

1. Open your browser
2. Go to: **http://localhost:3000**
3. Login with: `john.mokoena@thusanang.co.za` / `password123`
4. Explore:
   - ✅ Dashboard with leave balances
   - ✅ Payslips (view and download PDF)
   - ✅ Leave management (submit requests)
   - ✅ Calendar (see who's on/off)

---

## 🛠️ Configuration Summary

✅ **Supabase URL**: Configured  
✅ **API Keys**: Configured  
✅ **JWT Secret**: Set  
✅ **Environment Variables**: Created  
✅ **Dependencies**: Installed  
✅ **Seed Data**: Ready to load  

---

## 📋 Checklist

- [x] Created Supabase project
- [x] Ran database schema
- [ ] **Load seed data** (current step)
- [ ] Start application
- [ ] Test login
- [ ] Verify all features

---

Let me know once you've loaded the seed data, and I'll help you start and test the application! 🚀
