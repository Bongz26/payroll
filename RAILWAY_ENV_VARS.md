# Railway Environment Variables
# Copy these into your Railway service's Variables tab.
# DO NOT commit this file with real values filled in.

PORT=5000
NODE_ENV=production

# Supabase — copy from your existing .env
SUPABASE_URL=https://wstzcixvgnbttjlnxkdb.supabase.co
SUPABASE_ANON_KEY=<copy from .env>
SUPABASE_SERVICE_ROLE_KEY=<copy from .env>

# JWT — USE A STRONG SECRET (run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=24h

# CORS — set to your Vercel frontend URL after deploying frontend
# e.g. https://thusanang-payroll.vercel.app
FRONTEND_URL=https://<your-vercel-app>.vercel.app

# SMTP — optional but recommended
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-gmail-or-smtp-user>
SMTP_PASS=<your-smtp-app-password>
MAIL_FROM=no-reply@thusanangfs.co.za
