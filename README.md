# AMC NP — Device Service Portal

Electronic device Annual Maintenance Contract (AMC) management portal with role-based dashboards.

## Features

- **Customer**: Manage devices, book service, view bills, renew service contracts
- **Technician**: Accept jobs, mark complete (auto-generates bill)
- **Admin**: User management (CRUD, enable/disable, role change), switch user, full access
- **Service Renewal**: 4 plans + custom duration with bill generation
- **Device Detail Page**: Full info, renewals, service timeline

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT

## Demo Credentials

- Admin: `admin@amc.com` / `admin123`
- Customer: `demo@amc.com` / `demo123`
- Technician: `tech@amc.com` / `tech123`

## Local Development

```bash
# Backend
cd backend
npm install
node server.js

# Frontend (open in browser)
# http://localhost/index.html
```

## Deployment (Free)

### Backend → Render.com

1. Push code to GitHub
2. Go to https://render.com → New Web Service
3. Connect GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. Add Environment Variables:
   - `JWT_SECRET`: (long random string)
   - `FRONTEND_URL`: (your Vercel URL)
6. Deploy

### Frontend → Vercel.com

1. Go to https://vercel.com → New Project
2. Import GitHub repo
3. Settings:
   - **Root Directory**: `.` (root)
   - **Framework Preset**: Other
4. Deploy

### After Deployment

Edit `api.js` line 1:
```js
const API_URL = 'https://YOUR-BACKEND-NAME.onrender.com/api';
```

Or use the auto-detection by setting window.API_URL in HTML.

## API Endpoints

- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `PUT /api/auth/me` — Update profile
- `DELETE /api/auth/me` — Delete account
- `POST /api/auth/impersonate` — Admin: get user token
- `GET /api/devices` — List devices (own / all for admin)
- `POST /api/devices` — Add device
- `PUT /api/devices/:id` — Update
- `DELETE /api/devices/:id` — Delete
- `POST /api/devices/:id/renew` — Renew service
- `GET /api/devices/:id/renewals` — Renewal history
- `GET /api/services` — List services
- `POST /api/services` — Book service
- `PUT /api/services/:id/assign` — Admin: assign tech
- `PUT /api/services/:id/accept` — Tech: accept job
- `PUT /api/services/:id/complete` — Mark complete (creates bill)
- `GET /api/services/users/all` — Admin: list users
- `GET /api/bills` — List bills
- `PUT /api/bills/:id/pay` — Pay bill
- `POST /api/auth/users` — Admin: create user
- `PUT /api/auth/users/:id/status` — Admin: enable/disable
- `PUT /api/auth/users/:id/role` — Admin: change role
- `DELETE /api/auth/users/:id` — Admin: delete user

## Project Structure

```
.
├── index.html (Login)
├── dashboard.html (Customer Dashboard)
├── devices.html (Device list)
├── device-detail.html (Device detail)
├── booking.html (Service booking)
├── history.html (Service history)
├── bills.html (Bills)
├── settings.html (Settings)
├── admin.html (Admin panel)
├── technician.html (Tech panel)
├── api.js (API + profile dropdown)
├── style.css (Unified styles)
├── vercel.json (Vercel config)
└── backend/
    ├── server.js
    ├── amc.db
    ├── routes/ (auth, devices, services, bills)
    ├── .env.example
    └── package.json
```
