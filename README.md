# ✈️ INHouse Travel Booking Platform

Full-stack corporate travel booking system with multi-level approvals and Admin Panel.

## Approval Flow
```
Employee → HOD → Director → Travel Manager → APPROVED
```

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT + bcrypt

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- PostgreSQL running locally
- npm or yarn

### 1. Database
```bash
createdb ihouse_travel
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm install
npx prisma migrate dev --name init
npx prisma generate
npm run seed          # creates 5 test accounts
npm run dev           # starts on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173
```

Open **http://localhost:5173**

---

## Test Accounts (after seeding)

| Role           | Email                   | Password     |
|----------------|-------------------------|--------------|
| Admin          | admin@ihouse.com        | admin123     |
| Employee       | employee@ihouse.com     | password123  |
| HOD            | hod@ihouse.com          | password123  |
| Director       | director@ihouse.com     | password123  |
| Travel Manager | manager@ihouse.com      | password123  |

---

## Admin Panel Features
- View all users with request counts
- Change any user's role (Employee / HOD / Director / Travel Manager / Admin)
- Change user's department
- Delete users (protected — can't delete users with requests)
- Platform-wide stats: total users, requests, pending/approved/rejected
- View all travel requests with status filter
