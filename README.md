# Thusanang Funeral Services - Payroll System

A comprehensive employee self-service payroll system with features inspired by Sage HR, developed by **Dondas Tech**.

![Thusanang Logo](./client/public/assets/thusanang-logo.png)

## 🌟 Features

### Employee Self-Service Portal
- **Secure Login**: JWT-based authentication for employee access
- **Dashboard**: Personalized dashboard with quick stats and actions
- **Payslip Management**: View and download payslips as PDF
- **Leave Management**: 
  - Request leave with automated balance checking
  - View leave history and status
  - Multiple leave types (Annual, Sick, Family Responsibility, etc.)
- **Employee Calendar**: Visual calendar showing team member availability

### Key Capabilities
- ✅ View leave balances (Annual, Sick, Family Responsibility)
- ✅ Submit and track leave requests
- ✅ Download payslips in PDF format
- ✅ See who's on/off on the team calendar
- ✅ Responsive design for desktop and mobile

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** (via Supabase)
- **JWT** for authentication
- **bcrypt** for password hashing
- **PDFKit** for payslip generation

### Frontend
- **React** with Vite
- **React Router** for navigation
- **Axios** for API calls
- **date-fns** for date manipulation
- Modern CSS with custom design system

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (free tier works)

## 🚀 Installation

### 1. Clone the Repository
```bash
cd C:\Users\Bongz\Documents\WORK\SYSTEM\Payroll
```

### 2. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the schema: Copy and paste contents of `database/schema.sql`
4. Run the seed data: Copy and paste contents of `database/seed.sql`
   - **Note**: You'll need to generate proper password hashes first (see below)

### 3. Generate Password Hashes

Create a file `generate-hash.js` in the root directory:
```javascript
const bcrypt = require('bcrypt');

async function generateHash() {
  const hash = await bcrypt.hash('password123', 10);
  console.log(hash);
}

generateHash();
```

Run it:
```bash
npm install bcrypt
node generate-hash.js
```

Copy the hash and replace `$2b$10$YourHashedPasswordHere` in `database/seed.sql` with the actual hash.

### 4. Configure Environment Variables

Copy the example file:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# SMTP for email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM=no-reply@thusanangfs.co.za
```

> If you are upgrading an existing database, run the schema migration in `database/migration-add-leave-approval-columns.sql` before using the new manager/HR leave approval flow.

### 5. Install Dependencies

Install all dependencies:
```bash
npm run install-all
```

Or install individually:
```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

## 🎯 Running the Application

### Development Mode (Both Server & Client)
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:3000`

### Run Separately

**Start Backend Only:**
```bash
npm run server
```

**Start Frontend Only:**
```bash
npm run client
```

## 👤 Test Login Credentials

After running the seed data, you can login with:

| Email | Password | Role |
|-------|----------|------|
| john.mokoena@thusanang.co.za | password123 | Funeral Director |
| sarah.dlamini@thusanang.co.za | password123 | HR Manager |
| thabo.nkosi@thusanang.co.za | password123 | Driver |

## 📂 Project Structure

```
Payroll/
├── client/                  # React frontend
│   ├── public/
│   │   └── assets/         # Logos and images
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── pages/          # Page components
│   │   ├── utils/          # Utilities (API client)
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Design system
│   └── package.json
├── server/                  # Express backend
│   ├── config/             # Database config
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   ├── index.js            # Server entry point
│   └── package.json
├── database/               # Database files
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample data
├── .env.example            # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Employee login
- `GET /api/auth/profile` - Get employee profile
- `POST /api/auth/logout` - Logout

### Payslips
- `GET /api/payslips` - Get all payslips
- `GET /api/payslips/:id` - Get payslip details
- `GET /api/payslips/:id/download` - Download PDF

### Leave Management
- `GET /api/leave/balance` - Get leave balance
- `GET /api/leave/requests` - Get leave requests
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/calendar` - Get calendar data
- `GET /api/leave/pending` - Manager: get leave requests pending manager approval
- `GET /api/leave/pending/hr` - HR: get leave requests pending HR approval
- `POST /api/leave/request/:id/approve` - Manager approves a leave request
- `POST /api/leave/request/:id/reject` - Manager rejects a leave request
- `POST /api/leave/request/:id/hr-approve` - HR approves a manager-approved leave request
- `POST /api/leave/request/:id/hr-reject` - HR rejects a manager-approved leave request

## 🎨 Design System

The UI features a professional design system with:
- **Primary Color**: Thusanang Red (#D4145A)
- **Secondary Color**: Gold (#DAA520)
- **Modern Typography**: Inter font family
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Fade-in effects and hover states

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Row Level Security (RLS) in Supabase
- CORS configuration
- Secure token storage

## 📝 Future Enhancements

- [ ] Admin dashboard for HR management
- [ ] Email notifications for leave requests
- [ ] Payroll generation interface
- [ ] Employee document management
- [ ] Performance reviews
- [ ] Time and attendance tracking
- [ ] Mobile app (React Native)

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure Supabase URL and keys are correct in `.env`
- Check Supabase project is active
- Verify RLS policies are set up correctly

### Frontend Can't Connect to Backend
- Ensure backend is running on port 5000
- Check CORS settings in `server/index.js`
- Verify proxy settings in `client/vite.config.js`

### Login Not Working
- Verify password hashes were generated correctly
- Check JWT secret is set in `.env`
- Ensure employee status is 'active' in database

## 👨‍💻 Developed By

**Dondas Tech**
- Innovation • Creation • Acceleration

![Dondas Tech](./client/public/assets/dondas-tech-logo.png)

---

## 📄 License

This project was developed exclusively for Thusanang Funeral Services.

For support or inquiries, contact: **Dondas Tech**
