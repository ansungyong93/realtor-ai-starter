# Quick Manual Setup (If Automated Setup Fails)

The automated setup had an issue. Here's the **super simple manual version** (still just a few commands):

---

## Step 1: Open PowerShell

Press `Win + R`
Type: `powershell`
Press Enter

---

## Step 2: Navigate to Project Folder

Copy & paste this:
```powershell
cd "C:\Users\ansun\OneDrive\Desktop\realtor-ai-starter"
```

Press Enter

---

## Step 3: Install Dependencies

Copy & paste:
```powershell
npm install
```

Press Enter. Wait 2-3 minutes for it to finish.

---

## Step 4: Create Database (Docker)

Make sure Docker Desktop is running first (check taskbar).

Copy & paste:
```powershell
docker run --name realtor-ai-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

Press Enter.

Wait 10 seconds, then copy & paste:
```powershell
docker exec realtor-ai-db createdb -U postgres realtor_ai_dev
```

Press Enter.

---

## Step 5: Run Migrations

Copy & paste:
```powershell
npm run db:migrate
```

Press Enter. Wait for it to finish.

---

## Step 6: Create .env.local

Copy & paste this to create the file:
```powershell
Copy-Item ".env.example" ".env.local"
```

Press Enter.

---

## Step 7: Edit .env.local

Copy & paste to open it:
```powershell
notepad .env.local
```

Edit these 3 lines:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

Save and close Notepad.

---

## Step 8: Start Dev Server

Copy & paste:
```powershell
npm run dev
```

You should see:
```
> next dev
ready - started server on 0.0.0.0:3000
```

---

## Step 9: Open Dashboard

Open browser: http://localhost:3000/dashboard

✅ **Done!**

---

## That's It!

You now have:
- ✅ Database running
- ✅ Dev server running  
- ✅ Dashboard ready
- ✅ Claude + Gmail ready to test

Next: Send yourself a test email and process it!

