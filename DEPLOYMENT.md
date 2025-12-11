# Mind Mate Production Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed
- Domain name (optional, can use free subdomains)

---

## Option 1: Vercel + Railway (Recommended - FREE)

### Backend Deployment (Railway)

1. **Sign up**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select Repository**: `brajbeekay2017/mind-mate`
4. **Configure**:
   - Root Directory: `backend`
   - Start Command: `npm start`

5. **Add Environment Variables**:
   ```
   GROQ_API_KEY=your_groq_key
   OPENAI_API_KEY=your_openai_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_secret
   PORT=4000
   NODE_ENV=production
   LLM_PROVIDER=openai
   ```

6. **Copy Railway URL** (e.g., `https://mindmate-production.up.railway.app`)

7. **Add Final Variables**:
   ```
   GOOGLE_REDIRECT_URI=https://mindmate-production.up.railway.app/google-auth/callback
   FRONTEND_URL=https://mindmate.vercel.app
   ```

### Frontend Deployment (Vercel)

```powershell
cd frontend

# Update production environment
echo "VITE_API_URL=https://mindmate-production.up.railway.app" > .env.production

# Deploy
npm install -g vercel
vercel --prod
```

**Follow prompts**:
- Project name: `mindmate`
- Framework: Vite
- Output directory: `dist`

### Update Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Select OAuth 2.0 Client ID
3. **Authorized redirect URIs**:
   ```
   https://mindmate-production.up.railway.app/google-auth/callback
   ```
4. **Authorized JavaScript origins**:
   ```
   https://mindmate.vercel.app
   https://mindmate-production.up.railway.app
   ```

---

## Option 2: Dedicated Server (Linux)

### Server Requirements
- Ubuntu 20.04/22.04 LTS
- 1GB RAM minimum
- Node.js 18+

### Installation

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Install Nginx
sudo apt-get install -y nginx

# 4. Clone repository
cd /var/www
sudo git clone https://github.com/brajbeekay2017/mind-mate.git
cd mind-mate
sudo chown -R $USER:$USER /var/www/mind-mate

# 5. Setup backend
cd backend
npm install
# Create .env file (copy from .env.example and fill in values)

# 6. Start backend with PM2
pm2 start src/server.js --name mindmate-backend
pm2 save
pm2 startup

# 7. Build frontend
cd ../frontend
npm install
npm run build

# 8. Configure Nginx (see Nginx config below)

# 9. Setup SSL
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Nginx Configuration

Create `/etc/nginx/sites-available/mindmate`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/mind-mate/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(mood|chat|summary|recommendations|team-alerts|stress-recovery|alerts|google-auth|google-fit|login|health|privacy|callback)/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /team-alerts/stream {
        proxy_pass http://localhost:4000/team-alerts/stream;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mindmate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Option 3: Windows IIS

### Prerequisites
- Windows Server with IIS installed
- Node.js 18+ installed
- URL Rewrite module
- HttpPlatformHandler or PM2

### Quick Setup with PM2

```powershell
# 1. Install PM2
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# 2. Copy files to IIS directory
xcopy /E /I C:\Users\aksingh\Desktop\mind-mate C:\inetpub\wwwroot\mindmate

# 3. Install dependencies
cd C:\inetpub\wwwroot\mindmate\backend
npm install

cd ..\frontend
npm install
npm run build

# 4. Start backend with PM2
cd ..\backend
pm2 start src\server.js --name mindmate-backend
pm2 save

# 5. Configure IIS (see IIS web.config below)
```

### IIS web.config (Root)

Create `C:\inetpub\wwwroot\mindmate\web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyBackend" stopProcessing="true">
          <match url="^(mood|chat|summary|recommendations|team-alerts|stress-recovery|alerts|google-auth|google-fit|login|health|privacy|callback)(.*)" />
          <action type="Rewrite" url="http://localhost:4000/{R:0}" />
        </rule>
        <rule name="Frontend" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="frontend/dist/index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## Post-Deployment Verification

### Test Checklist

```powershell
# Health check
Invoke-RestMethod https://your-backend-url/health

# Privacy policy
Start-Process https://your-backend-url/privacy

# Frontend
Start-Process https://your-frontend-url
```

**Manual Testing:**
- ✅ Google OAuth login
- ✅ Google Fit data loads
- ✅ Mood entry submission
- ✅ Chat responses from LLM
- ✅ Stress recovery challenges
- ✅ Team alerts streaming (SSE)

---

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` matches exactly
- Check browser console for origin mismatch

### OAuth Errors
- Verify Google Cloud Console redirect URIs
- Check `GOOGLE_REDIRECT_URI` in backend .env

### 502 Bad Gateway
- Verify backend is running: `pm2 status`
- Check logs: `pm2 logs mindmate-backend`

### Blank Frontend
- Check `VITE_API_URL` in .env.production
- Verify build completed: check `frontend/dist/` folder

---

## Monitoring

### Railway
- Dashboard → View Logs
- Monitor usage (500 hours/month free tier)

### Linux Server
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs mindmate-backend --lines 100

# System resources
htop
```

### Windows IIS
```powershell
# PM2 logs
pm2 logs mindmate-backend

# Event Viewer
eventvwr
```

---

## Updates

```bash
# Pull latest code
git pull origin mind-mate-final-V2.0

# Update backend
cd backend
npm install
pm2 restart mindmate-backend

# Update frontend
cd ../frontend
npm install
npm run build
# Frontend auto-updates (Nginx/IIS serves new files)
```

---

## Cost Estimate

| Platform | Free Tier | Monthly Cost |
|----------|-----------|--------------|
| Railway | 500 hours | $0 |
| Vercel | Unlimited | $0 |
| VPS (DigitalOcean) | - | $5-10 |
| Google APIs | Free quota | $0 |
| OpenAI | Pay-as-you-go | $1-2 |
| Groq | Free | $0 |

**Total**: $0-2/month for cloud platforms, $5-10/month for VPS

---

## Support

- **Email**: amiteshsingh.smsit@gmail.com
- **GitHub Issues**: https://github.com/brajbeekay2017/mind-mate/issues
- **Documentation**: Check README.md

---

## Security Checklist

- [ ] `.env` files not committed to Git
- [ ] HTTPS enabled (SSL certificate)
- [ ] Google OAuth restricted to production URLs
- [ ] API keys rotated if exposed
- [ ] CORS configured properly
- [ ] Rate limiting enabled (production)
- [ ] Error messages don't leak sensitive data
