# Iron Quest Deployment Guide

This guide covers deploying Iron Quest to Railway (backend) and Vercel (frontend).

## Prerequisites

- GitHub account with the repository pushed
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)

---

## Backend Deployment (Railway)

### Option 1: Web Dashboard

1. **Create Project**
   - Go to https://railway.app
   - Click "New Project" > "Deploy from GitHub repo"
   - Select `iron-quest` repository

2. **Add PostgreSQL Database**
   - In your project, click "+ New"
   - Select "Database" > "PostgreSQL"
   - Railway automatically provisions the database

3. **Configure the Service**
   - Click on your app service
   - Go to "Settings" tab
   - Set "Root Directory" to `server` (if available)
   - Or use the `nixpacks.toml` config in the repo

4. **Set Environment Variables**
   - Go to "Variables" tab
   - Add the following:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | `<generate-a-strong-secret>` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `FRONTEND_URL` | `https://your-app.vercel.app` |

   - Click "+ Add Variable" > "Add Reference"
   - Select your PostgreSQL database
   - Choose `DATABASE_URL`

5. **Generate Domain**
   - Go to "Settings" > "Networking"
   - Click "Generate Domain"
   - Copy the URL (e.g., `iron-quest-production.up.railway.app`)

6. **Verify Deployment**
   - Visit `https://your-railway-url.up.railway.app/health`
   - Should return: `{"status":"ok",...}`

### Option 2: Railway CLI

```bash
# Install CLI
npm install -g @railway/cli
# or
brew install railway

# Login
railway login

# Initialize project (from server directory)
cd server
railway init

# Deploy
railway up

# Add PostgreSQL
railway add

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret-key
railway variables set FRONTEND_URL=https://your-app.vercel.app

# Get deployment URL
railway domain
```

---

## Frontend Deployment (Vercel)

### Option 1: Web Dashboard

1. **Import Project**
   - Go to https://vercel.com
   - Click "Add New" > "Project"
   - Import from GitHub: `iron-quest`

2. **Configure Build**
   - Framework Preset: "Other"
   - Root Directory: `.` (leave as root)
   - Build Command: (leave empty)
   - Output Directory: `.`

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

4. **Get URL**
   - Copy the deployment URL
   - Update Railway's `FRONTEND_URL` variable with this URL

### Option 2: Vercel CLI

```bash
# Install CLI
npm install -g vercel
# or
brew install vercel-cli

# Login
vercel login

# Deploy (from project root)
vercel --prod

# Get deployment URL from output
```

---

## Post-Deployment Configuration

### 1. Update CORS Settings

After deploying the frontend, update Railway's `FRONTEND_URL`:

1. Go to Railway > your app service > Variables
2. Set `FRONTEND_URL` to your Vercel URL
3. Railway will auto-redeploy

### 2. Update Frontend API URL

If your Railway URL differs from the default, update `js/api.js`:

```javascript
PRODUCTION_API_URL: 'https://your-railway-url.up.railway.app',
```

Then push to GitHub (Vercel auto-deploys).

### 3. Initialize Database

The database schema is auto-created on first server start. If you need to manually initialize:

```bash
# Via Railway CLI
railway run npm run db:init

# Or connect directly
railway connect postgres
# Then run schema.sql
```

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (auto-set by Railway) |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | No | Token expiration (default: `7d`) |
| `NODE_ENV` | No | `production` or `development` |
| `PORT` | No | Server port (default: `3001`) |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |

### Generating a JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64
```

---

## Continuous Deployment

Both Railway and Vercel support auto-deployment from GitHub:

1. **Push to `main` branch**
2. **Railway** detects changes in `server/` and redeploys backend
3. **Vercel** detects changes and redeploys frontend

### Disable Auto-Deploy

**Railway:**
- Settings > Source > Disable "Automatic Deployments"

**Vercel:**
- Settings > Git > Disable "Auto-Deploy"

---

## Monitoring & Logs

### Railway Logs
```bash
# CLI
railway logs

# Or in dashboard: click deployment > "View Logs"
```

### Vercel Logs
```bash
# CLI
vercel logs your-deployment-url

# Or in dashboard: Deployments > click deployment > "Functions" tab
```

---

## Troubleshooting

### Backend won't start

1. **Check logs**: Railway dashboard > deployment > View Logs
2. **Common issues**:
   - Missing `DATABASE_URL` - add PostgreSQL reference
   - Invalid `JWT_SECRET` - set a valid secret
   - Port conflict - Railway auto-assigns `PORT`

### CORS errors

1. Verify `FRONTEND_URL` in Railway matches your Vercel domain exactly
2. Include protocol: `https://your-app.vercel.app`
3. Redeploy after changing environment variables

### Database connection failed

1. Check PostgreSQL is added to Railway project
2. Verify `DATABASE_URL` is referenced (not hardcoded)
3. Check Railway PostgreSQL service is running

### Express 5 route errors

If you see `PathError: Missing parameter name`:
- The wildcard route syntax changed in Express 5
- Use `/{*splat}` instead of `*`

---

## Custom Domain (Optional)

### Vercel
1. Settings > Domains
2. Add your domain
3. Update DNS records as instructed

### Railway
1. Settings > Networking > Custom Domain
2. Add your domain
3. Update DNS CNAME to Railway's domain

Remember to update `FRONTEND_URL` if you change the frontend domain.

---

## Cost Considerations

### Railway
- Free tier: $5/month credits
- PostgreSQL: included in credits
- Estimated cost for low traffic: Free

### Vercel
- Hobby tier: Free
- 100GB bandwidth/month
- Unlimited deployments

For a typical fitness app with moderate usage, both free tiers should suffice.
