# Installation & Setup Guide

## Step 1: Install Node.js (if not already installed)

Node.js and npm are required to run this application.

### macOS
Option A - Using Homebrew (if installed):
```bash
brew install node
```

Option B - Direct download:
1. Visit https://nodejs.org/
2. Download LTS version (v18 or later)
3. Run the installer
4. Verify: `node --version` and `npm --version`

### Windows
1. Visit https://nodejs.org/
2. Download LTS version (v18 or later)
3. Run the .msi installer
4. Follow installation wizard
5. Restart terminal and verify: `node --version` and `npm --version`

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nodejs npm
node --version
npm --version
```

## Step 2: Navigate to Project Directory

```bash
cd /Users/erbyfischer/Documents/beginners-luck/negotiation-engine
```

## Step 3: Run Setup

### Option A: Automated Setup (macOS/Linux)
```bash
chmod +x setup.sh
./setup.sh
```

### Option B: Automated Setup (Windows)
```bash
setup.bat
```

### Option C: Manual Setup

**Terminal 1 - Start Backend:**
```bash
cd server
npm install
npm start
```

You should see:
```
✓ Negotiation Engine API running on http://localhost:5000
```

**Terminal 2 - Start Frontend:**
```bash
cd client
npm install
npm start
```

The app will automatically open at http://localhost:3000

## Step 4: Verify Installation

### Backend Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"ok","message":"Negotiation Engine API is running"}
```

### Frontend Access
Open http://localhost:3000 in your browser

## Testing the Application

### Test 1: Create a Negotiation
1. Click "+ New" button
2. Fill in case name (required)
3. Add optional case details
4. Click "Create Negotiation"
5. Verify negotiation appears in sidebar

### Test 2: Record Moves
1. Select a negotiation
2. In "Demand & Offer Tracker", fill in:
   - Party: Plaintiff or Defendant
   - Type: Demand or Offer
   - Amount: Enter a dollar amount
3. Click "Add Move"
4. Verify move appears in timeline

### Test 3: View Analytics
1. After adding at least 2 moves (1 demand, 1 offer)
2. Scroll to "Analytics & Predictions"
3. Verify metrics display:
   - Current Midpoint
   - Momentum
   - Predicted Settlement
   - Confidence score

### Test 4: Export to PDF
1. Select a negotiation with moves
2. Click "📄 PDF" button
3. Verify PDF downloads with case information

### Test 5: Search & Filter
1. Enter text in search box
2. Use filter icon (⚙️) for advanced filters
3. Verify results update in real-time

### Test 6: Advanced Filters
1. Click filter icon (⚙️)
2. Select status (active/settled/initiated)
3. Enter venue name
4. Click "Reset Filters" to clear

## Troubleshooting

### Port Already in Use
If port 3000 or 5000 is already in use:

macOS/Linux:
```bash
# Find and kill process
lsof -i :3000  # or :5000
kill -9 <PID>
```

Windows:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### npm Install Fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Retry installation
npm install
```

### SQLite Build Issues (macOS)
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Retry npm install
npm install
```

### CORS Errors
- Ensure backend runs on port 5000
- Ensure frontend runs on port 3000
- Check browser console (F12) for error details
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Frontend Doesn't Start
```bash
# Check if port 3000 is in use
# Set custom port
PORT=3001 npm start

# Update API URL in App.js if needed
```

## Running in Production

For production deployment:

1. Build frontend:
```bash
cd client
npm run build
# Creates optimized build in client/build
```

2. Deploy backend with PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name "negotiation-api"
pm2 save
```

3. Serve frontend with web server (nginx, Apache, etc.)

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Full Support |
| Firefox | 88+     | ✅ Full Support |
| Safari  | 14+     | ✅ Full Support |
| Edge    | 90+     | ✅ Full Support |

## Performance Baseline

Expected performance on modern hardware:

- **App Load**: < 2 seconds
- **Add Move**: < 500ms
- **PDF Export**: < 3 seconds
- **Search**: < 100ms
- **Analytics Recalculation**: < 200ms

## Next Steps

1. ✅ Installation complete
2. 📝 Create your first negotiation
3. 📊 Add moves and track progress
4. 📈 Monitor analytics and predictions
5. 📄 Export reports to PDF

## Support

For detailed feature documentation, see:
- `FEATURES.md` - Feature descriptions
- `ARCHITECTURE.md` - Technical architecture
- `USAGE_EXAMPLES.md` - Real-world usage examples

## Environment Variables (Optional)

Create `.env` files to customize:

**server/.env:**
```
PORT=5000
DATABASE_PATH=./negotiations.db
NODE_ENV=production
```

**client/.env:**
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

**Need help?** Check the troubleshooting section above or review the browser console (F12) for error messages.
