# 🧪 MANUAL TESTING GUIDE

## ✅ Server Status
Both servers are currently running:
- **Backend API**: http://localhost:5000 (✅ Connected to Supabase)
- **Frontend**: http://localhost:3000

---

## 🔐 Test 1: Login

### Steps:
1. Open your browser
2. Go to: **http://localhost:3000**
3. You should see the Thusanang login page with red/gold branding
4. Enter credentials:
   - **Email**: `john.mokoena@thusanangfs.co.za`
   - **Password**: `password123`
5. Click **Login**

### Expected Result:
✅ Redirect to Dashboard at `/dashboard`

### If Login Fails:
Check browser console (F12) for errors and let me know the exact error message.

---

## 📊 Test 2: Dashboard

After successful login, verify the dashboard shows:

 ✅ Welcome message with employee name
- ✅ Leave balance cards (Annual, Sick, Family Responsibility)
- ✅ Latest payslip amount
- ✅ Quick action buttons
- ✅ Recent leave requests table

---

## 💰 Test 3: Payslips

1. Click **"Payslips"** in the navigation bar
2. Verify you see a table of payslips

### Test Actions:
- ✅ Click **"View"** button → Modal should open with payslip details
- ✅ Click **"Download"** button → PDF should download
- ✅ Open the PDF → Should show Thusanang branding and all salary details

---

## 🏖️ Test 4: Leave Management

1. Click **"Leave"** in navigation
2. Verify you see:
   - Leave balance cards at top
   - Tabs: "Request Leave" and "Leave History"

### Test Request Leave:
1. Select leave type (e.g., "Annual Leave")
2. Pick start and end dates
3. Enter a reason
4. Click **"Submit Request"**

### Expected Result:
✅ Success message
✅ New request appears in "Leave History" tab with "Pending" status

---

## 📅 Test 5: Calendar

1. Click **"Calendar"** in navigation
2. Verify:
   - ✅ Calendar grid showing current month
   - ✅ Employees on leave are shown with icons
   - ✅ Can navigate to previous/next months
   - ✅ "Today" button works

---

## 🔄 Test 6: Navigation

Verify all navigation works:
- ✅ Dashboard link
- ✅ Payslips link
- ✅ Leave link
- ✅ Calendar link
- ✅ Logout button

### Test Logout:
1. Click user icon/logout button
2. Should redirect to `/login`
3. Try accessing `/dashboard` directly
4. Should redirect back to login (protected route working)

---

## 📱 Test 7: Responsive Design

1. Resize browser window to different sizes
2. Try on mobile viewport (F12 → Device toolbar)
3. Verify UI adapts properly

---

## 🎨 Test 8: Branding

Verify you see:
- ✅ Thusanang Funeral Services logo
- ✅ Dondas Tech attribution
- ✅ Red (#D4145A) and Gold colors
- ✅ Professional, modern design

---

## 🐛 If Something Doesn't Work

### Check Browser Console:
1. Press F12
2. Go to Console tab
3. Look for red errors
4. Share the error message with me

### Check Network Tab:
1. Press F12
2. Go to Network tab
3. Try the action again
4. Look for failed requests (red)
5. Click on failed request
6. Share the response

---

## 📋 Quick Test Checklist

After testing everything, mark what works:

- [ ] Login successful
- [ ] Dashboard loads with data
- [ ] Can view payslips
- [ ] Can download payslip PDF
- [ ] PDF opens and looks professional
- [ ] Can submit leave request
- [ ] Leave history displays
- [ ] Calendar shows employees on leave
- [ ] Navigation between pages works
- [ ] Logout works
- [ ] Cannot access protected pages when logged out
- [ ] Mobile/responsive design works

---

## 🎯 Test Credentials

| Employee | Email | Password |
|----------|-------|----------|
| John Mokoena | john.mokoena@thusanangfs.co.za | password123 |
| Sarah Dlamini | sarah.dlamini@thusanangfs.co.za | password123 |
| Thabo Nkosi | thabo.nkosi@thusanangfs.co.za | password123 |

Try logging in with different employees to verify each has their own data.

---

## 📸 Screenshots

Please take screenshots of:
1. Login page
2. Dashboard
3. Payslips page
4. Downloaded PDF
5. Leave management
6. Calendar view

---

**Ready to test!** Open http://localhost:3000 in your browser now! 🚀
