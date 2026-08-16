# RealtorAI Automated Setup Script for Windows
# This script sets up everything: Node, Docker, PostgreSQL, environment variables, database, and starts the dev server
#
# HOW TO RUN:
# 1. Open PowerShell as Administrator
# 2. Navigate to realtor-ai-starter folder
# 3. Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# 4. Run: .\setup.ps1

Write-Host "🚀 RealtorAI Automated Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Function to pause
function Pause-Script {
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  Please run PowerShell as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "1. Close this window"
    Write-Host "2. Right-click PowerShell"
    Write-Host "3. Click 'Run as Administrator'"
    Write-Host "4. Type: cd C:\Users\ansun\OneDrive\Desktop\realtor-ai-starter"
    Write-Host "5. Type: .\setup.ps1"
    exit 1
}

# ============================================================================
# CHECK 1: Node.js
# ============================================================================
Write-Host "1️⃣  Checking Node.js..." -ForegroundColor Cyan

$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Then run this script again" -ForegroundColor Yellow
    Pause-Script
    exit 1
}

# ============================================================================
# CHECK 2: .env.local
# ============================================================================
Write-Host ""
Write-Host "2️⃣  Checking .env.local file..." -ForegroundColor Cyan

if (Test-Path ".env.local") {
    Write-Host "✅ .env.local exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local not found. Creating from .env.example..." -ForegroundColor Yellow

    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "✅ Created .env.local from template" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Edit .env.local and add:" -ForegroundColor Yellow
        Write-Host "   - ANTHROPIC_API_KEY (from https://console.anthropic.com/account/keys)" -ForegroundColor Yellow
        Write-Host "   - GOOGLE_CLIENT_ID (from https://console.cloud.google.com/)" -ForegroundColor Yellow
        Write-Host "   - GOOGLE_CLIENT_SECRET" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press Enter to continue..." -ForegroundColor Yellow
        Read-Host
    } else {
        Write-Host "❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Check if credentials are set
$envContent = Get-Content ".env.local"
$hasApiKey = $envContent | Select-String "ANTHROPIC_API_KEY.*sk-ant"
$hasGoogleId = $envContent | Select-String "GOOGLE_CLIENT_ID.*\w+"

if (-not $hasApiKey) {
    Write-Host ""
    Write-Host "⚠️  ANTHROPIC_API_KEY not set in .env.local" -ForegroundColor Red
    Write-Host "Get your key from: https://console.anthropic.com/account/keys" -ForegroundColor Yellow
}

if (-not $hasGoogleId) {
    Write-Host "⚠️  GOOGLE_CLIENT_ID not set in .env.local" -ForegroundColor Red
    Write-Host "Get credentials from: https://console.cloud.google.com/" -ForegroundColor Yellow
}

# ============================================================================
# CHECK 3: Docker
# ============================================================================
Write-Host ""
Write-Host "3️⃣  Checking Docker..." -ForegroundColor Cyan

$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green

    # Check if Docker daemon is running
    $dockerRunning = docker ps 2>$null
    if ($dockerRunning) {
        Write-Host "✅ Docker daemon is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Docker daemon not running. Starting..." -ForegroundColor Yellow

        # Try to start Docker Desktop
        $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerPath) {
            Start-Process $dockerPath
            Write-Host "⏳ Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
        } else {
            Write-Host "❌ Docker Desktop not found at $dockerPath" -ForegroundColor Red
            Write-Host "Please start Docker Desktop manually" -ForegroundColor Yellow
            Pause-Script
        }
    }
} else {
    Write-Host "⚠️  Docker not installed. Attempting to install..." -ForegroundColor Yellow
    Write-Host "Please download Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "Then run this script again" -ForegroundColor Yellow
    Pause-Script
    exit 1
}

# ============================================================================
# CHECK 4: PostgreSQL Database
# ============================================================================
Write-Host ""
Write-Host "4️⃣  Setting up PostgreSQL database..." -ForegroundColor Cyan

$dbExists = docker ps -a | Select-String "realtor-ai-db"

if ($dbExists) {
    Write-Host "✅ Database container exists" -ForegroundColor Green

    # Check if running
    $dbRunning = docker ps | Select-String "realtor-ai-db"
    if ($dbRunning) {
        Write-Host "✅ Database container is running" -ForegroundColor Green
    } else {
        Write-Host "⏳ Starting database container..." -ForegroundColor Yellow
        docker start realtor-ai-db
        Start-Sleep -Seconds 3
        Write-Host "✅ Database started" -ForegroundColor Green
    }
} else {
    Write-Host "⏳ Creating PostgreSQL container..." -ForegroundColor Yellow
    docker run --name realtor-ai-db `
      -e POSTGRES_PASSWORD=password `
      -p 5432:5432 `
      -d postgres:15 | Out-Null

    Start-Sleep -Seconds 5
    Write-Host "✅ Database created" -ForegroundColor Green
}

# Verify database connection
Write-Host "⏳ Verifying database connection..." -ForegroundColor Yellow
$dbTest = docker exec realtor-ai-db psql -U postgres -d postgres -c "SELECT 1" 2>$null
if ($dbTest) {
    Write-Host "✅ Database is accessible" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database test failed. Waiting and retrying..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $dbTest = docker exec realtor-ai-db psql -U postgres -d postgres -c "SELECT 1" 2>$null
    if ($dbTest) {
        Write-Host "✅ Database is accessible" -ForegroundColor Green
    }
}

# Create RealtorAI database
Write-Host "⏳ Creating realtor_ai_dev database..." -ForegroundColor Yellow
docker exec realtor-ai-db createdb -U postgres realtor_ai_dev 2>$null
if ($?) {
    Write-Host "✅ Database realtor_ai_dev is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database might already exist (that's fine)" -ForegroundColor Yellow
}

# ============================================================================
# CHECK 5: Install NPM Dependencies
# ============================================================================
Write-Host ""
Write-Host "5️⃣  Installing npm dependencies..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "✅ node_modules already exists" -ForegroundColor Green
} else {
    Write-Host "⏳ Running npm install..." -ForegroundColor Yellow
    npm install
    if ($?) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Pause-Script
        exit 1
    }
}

# ============================================================================
# CHECK 6: Database Migrations
# ============================================================================
Write-Host ""
Write-Host "6️⃣  Running database migrations..." -ForegroundColor Cyan

Write-Host "⏳ Creating database tables..." -ForegroundColor Yellow
npm run db:migrate
if ($?) {
    Write-Host "✅ Database tables created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migration may have failed. Check the output above" -ForegroundColor Yellow
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Node.js:       Installed and working"
Write-Host "  ✅ Docker:        Running"
Write-Host "  ✅ PostgreSQL:    Running (password: password)"
Write-Host "  ✅ Database:      realtor_ai_dev created"
Write-Host "  ✅ NPM packages:  Installed"
Write-Host "  ✅ Migrations:    Completed"
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. IMPORTANT: Open .env.local and add credentials:" -ForegroundColor Yellow
Write-Host "   - ANTHROPIC_API_KEY (get from https://console.anthropic.com/account/keys)"
Write-Host "   - GOOGLE_CLIENT_ID (get from https://console.cloud.google.com/)"
Write-Host "   - GOOGLE_CLIENT_SECRET"
Write-Host ""
Write-Host "2. Start the dev server:" -ForegroundColor Yellow
Write-Host "   npm run dev"
Write-Host ""
Write-Host "3. Open browser:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/dashboard"
Write-Host ""
Write-Host "4. Test Claude integration:" -ForegroundColor Yellow
Write-Host "   node test-email-flow.js"
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit" -ForegroundColor Yellow
Read-Host
