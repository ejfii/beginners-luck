# ⚖️ Negotiation Engine

A full-stack web application for managing civil settlement negotiations with real-time analytics, offer tracking, and settlement prediction.

## Features

### Core Negotiation Tools
- **Case Management**: Create and track civil settlement negotiations
- **Offer Tracking**: Record demands and offers throughout the negotiation process
- **Bracket Proposals**: Create alternative settlement ranges for plaintiff and defendant with visual range bars
- **Mediator Proposals**: Submit time-limited settlement proposals with countdown timer and dual-party acceptance tracking
- **Move Tracker**: Record and analyze negotiation moves (offers/demands)

### Case Evaluation System ✨ NEW
- **Damages Breakdown**: Track medical specials, economic damages, and non-economic damages
- **Liability Assessment**: Apply liability percentage (0-100%) to calculate adjusted case value
- **Settlement Range Projection**: Automatic calculation of 60-90% settlement range based on adjusted value
- **Policy Limits Integration**: Cap projections at policy limits and track utilization
- **Real-time Calculations**: Instant updates as evaluation data changes
- **Smart Bracket Suggestions**: Bracket recommendations now prioritize evaluation data when available

### Insurer & Adjuster Intelligence ✨ NEW
- **Historical Analytics**: View past case statistics by insurer or adjuster
- **Pattern Detection**: Automatically identify adjuster negotiation styles:
  - Aggressive Negotiator (first move <40%)
  - Quick Settler (avg duration <30 days)
  - Policy Limits Comfortable (settlements >80% of limits)
- **Strategy Insights**: AI-powered recommendations based on historical patterns
- **Move Analysis**: Track first move percentages and negotiation tendencies

### Analytics & Insights
- **Enhanced Analytics Dashboard**: View both negotiation analytics and evaluation metrics
- **Convergence Tracking**: Monitor convergence rates, momentum, and gap reduction
- **Settlement Prediction**: AI-powered settlement amount prediction
- **Evaluation vs Prediction**: Compare case evaluation with negotiation trajectory
- **Policy Utilization**: Track how close settlements approach policy limits

### Productivity Features
- **Search & Filter**: Find cases by name, attorney, venue, or status
- **Inline Editing**: Edit case details and injury descriptions directly from the UI
- **Professional PDF Export**: Generate detailed negotiation reports with code-split libraries
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **User Authentication**: Secure login with JWT tokens and bcrypt password hashing

## Tech Stack

- **Frontend**: React 18 with Axios, code-split dynamic imports for PDF libraries
- **Backend**: Node.js + Express with JWT authentication
- **Database**: SQLite3 with persistent connection pooling
- **Security**: bcryptjs password hashing, JWT tokens, input validation & sanitization
- **UI**: CSS3 with responsive design, gradient styling, real-time countdown timers
- **Tooling**: ESLint, Prettier for code quality

## Quick Start

### Prerequisites

- Node.js 14+ and npm
- macOS, Linux, or Windows

### Development Setup

1. **Navigate to the project**
   ```bash
   cd negotiation-engine
   ```

2. **Install dependencies**
   ```bash
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

3. **Start the backend server** (Terminal 1)
   ```bash
   cd server
   npm start
   # Server runs on http://localhost:5001
   ```

4. **Start the frontend dev server** (Terminal 2)
   ```bash
   cd client
   npm start
   # App opens at http://localhost:3000
   ```

### Production Build

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Serve the production build** (Terminal 1)
   ```bash
   cd server
   PORT=5001 npm start
   ```

3. **Serve static assets** (Terminal 2)
   ```bash
   npx serve -s client/build -l 3000
   # Serves at http://localhost:3000
   ```

## Environment Variables

### Backend (`server/`)

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `PORT` | `5001` | Server listen port | No |
| `NODE_ENV` | `development` | Environment mode | No |
| `JWT_SECRET` | ⚠️ `'your-secret-key-change-in-production'` | Secret key for JWT token signing | **YES (Production)** |
| `JWT_EXPIRATION` | `12h` | JWT token lifetime (e.g., `12h`, `8h`, `1d`) | No |

#### Security Configuration

**CRITICAL**: In production, you **MUST** set `JWT_SECRET` to a strong, random value:

```bash
# Generate a secure random secret (example)
export JWT_SECRET="$(openssl rand -base64 32)"

# Set expiration (optional, defaults to 12 hours)
export JWT_EXPIRATION="8h"

# Start server
PORT=5001 npm start
```

**JWT Token Behavior:**
- Tokens expire after the configured lifetime (default: 12 hours)
- When a token expires, the user is automatically logged out
- Frontend displays: "Session expired. Please log in again."
- Users must re-authenticate to continue

**Rate Limiting:**
- Login endpoint is rate-limited to prevent brute force attacks
- Maximum 5 failed login attempts per IP/username combination
- Lockout duration: 15 minutes after exceeding limit

Example:
```bash
JWT_SECRET=your_secure_random_secret_here JWT_EXPIRATION=12h PORT=5001 npm start
```

### Frontend (`client/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:5001/api` | Backend API endpoint |

Create `client/.env.local`:
```
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user (username, password)
- `POST /api/auth/login` — Login and receive JWT token

### Negotiations
- `GET /api/negotiations` — List all negotiations for authenticated user
- `POST /api/negotiations` — Create negotiation (requires auth)
- `GET /api/negotiations/:id` — Get negotiation with moves and analytics
- `PUT /api/negotiations/:id` — Update negotiation
- `DELETE /api/negotiations/:id` — Delete negotiation

### Moves (Offers/Demands)
- `POST /api/moves` — Add offer or demand
- `GET /api/moves/:negotiation_id` — List moves for a negotiation
- `DELETE /api/moves/:id` — Delete move

### Bracket Proposals (NEW)
- `GET /api/negotiations/:id/brackets` — Get all brackets for a negotiation
- `POST /api/negotiations/:id/brackets` — Create bracket proposal with plaintiff/defendant ranges
- `PUT /api/brackets/:id` — Update bracket status (active/accepted/rejected)

### Mediator Proposals (NEW)
- `GET /api/negotiations/:id/mediator-proposal` — Get mediator proposal with expiration check
- `POST /api/negotiations/:id/mediator-proposal` — Create/replace mediator proposal with deadline
- `PUT /api/negotiations/:id/mediator-proposal` — Accept/reject as plaintiff or defendant
- `POST /api/mediator-proposals/check-expired` — Utility endpoint to mark expired proposals

### Insurer & Adjuster Intelligence ✨ NEW
- `GET /api/analytics/insurer/:insurerName` — Get historical analytics for a specific insurer
  - Returns: case count, avg settlement, settlement rate, avg duration, avg policy limits, avg moves
  - Includes list of past cases with this insurer
- `GET /api/analytics/adjuster/:adjusterName` — Get historical analytics and pattern detection for an adjuster
  - Returns: negotiation style patterns (aggressive, quick settler, policy comfortable)
  - Includes: avg first move percentage, strategy insights, past cases with move analysis

### Data Export & Backup
- `GET /api/negotiations/:id/export` — Export complete negotiation with all related data (moves, brackets, mediator proposal) for backup or debugging

### Search & Analytics
- `POST /api/search` — Search by query and filters
- `GET /api/analytics/:negotiation_id` — Get analytics for negotiation
- `GET /api/health` — Health check

## Database

SQLite database located at `server/negotiations.db`.

### Data Integrity Features

**Foreign Key Constraints**: Enabled with `PRAGMA foreign_keys = ON` to ensure referential integrity across all tables.

**Indexes**: Explicit indexes created on all foreign key columns for optimal query performance:
- `idx_negotiations_user_id` on `negotiations.user_id`
- `idx_moves_negotiation_id` on `moves.negotiation_id`
- `idx_brackets_negotiation_id` on `brackets.negotiation_id`
- `idx_mediator_proposals_negotiation_id` on `mediator_proposals.negotiation_id`

**Soft Delete**: Negotiations use soft delete (setting `deleted_at` timestamp) instead of physical deletion. Benefits:
- Data recovery capability
- Audit trail preservation
- Related data (moves, brackets, proposals) remains intact
- All queries automatically filter out soft-deleted records
- Use `DELETE /api/negotiations/:id` to soft delete a negotiation

**Data Export**: Use `GET /api/negotiations/:id/export` to retrieve complete negotiation data including all moves, brackets, and mediator proposals for backup or debugging purposes.

### Tables

**users**: User accounts
- `id`, `username` (unique), `password_hash`, `created_date`

**negotiations**: Case information
- `id`, `user_id` (foreign key), `name`, `created_date`, `updated_date`
- `plaintiff_attorney`, `defendant_attorney`, `mediator`, `judge`, `venue`
- `coverage`, `defendant_type`, `injury_description`
- `past_medical_bills`, `future_medical_bills`, `lcp`, `lost_wages`, `loss_earning_capacity`
- `status` (active|settled|closed|withdrawn)
- `deleted_at` (soft delete timestamp - NULL for active negotiations)

**moves**: Negotiation moves (offers/demands)
- `id`, `negotiation_id`, `timestamp`, `party`, `type`, `amount`, `notes`

**calculations**: Analytics results
- `id`, `negotiation_id`, `move_id`, `midpoint`, `midpoint_of_midpoints`, `momentum`, `predicted_settlement`, `created_at`

**brackets** (NEW): Alternative settlement range proposals
- `id`, `negotiation_id`, `created_at`
- `plaintiff_low`, `plaintiff_high`, `defendant_low`, `defendant_high`
- `notes`, `status` (active|accepted|rejected)

**mediator_proposals** (NEW): Time-limited mediator settlement proposals
- `id`, `negotiation_id` (unique - one active proposal per case), `created_at`
- `amount`, `deadline` (ISO timestamp), `notes`
- `status` (pending|accepted_plaintiff|accepted_defendant|accepted_both|rejected|expired)
- `plaintiff_response` (pending|accepted|rejected), `defendant_response` (pending|accepted|rejected)

## Seed Data

Add sample negotiations for testing:

```bash
cd server
node scripts/seed.js  # Creates demo user (demo/demo123) and 2 cases with moves
node scripts/seed-brackets.js  # Adds bracket proposals and mediator proposals
cd ..
```

**Demo Credentials:**
- Username: `demo`
- Password: `demo123`

Creates 2 example cases with:
- Sample offers and demands
- 3 bracket proposals per case (2 active, 1 rejected)
- 1 mediator proposal with 7-day deadline

## Project Structure

```
negotiation-engine/
├── client/                 # React SPA frontend
│   ├── src/
│   │   ├── components/    # React components (NegotiationForm, etc.)
│   │   ├── styles/        # Component CSS
│   │   └── App.js
│   ├── public/
│   ├── build/             # Production build output
│   └── package.json
├── server/                # Node.js/Express backend
│   ├── routes/            # API handlers (negotiations.js, moves.js, search.js)
│   ├── middleware/        # Express middleware (logging, errors)
│   ├── database.js        # SQLite connection + queries
│   ├── validation.js      # Input validation & sanitization
│   ├── calculations.js    # Settlement prediction logic
│   ├── index.js           # Server entry point
│   ├── scripts/
│   │   └── seed.js        # Demo data script
│   ├── negotiations.db    # SQLite database (auto-created)
│   └── package.json
├── README.md
└── START_HERE.txt
```

## Validation & Error Handling

- **Input Validation**: All POST/PUT requests validated server-side
- **Error Display**: API errors shown in error banner UI
- **Sanitization**: HTML-safe input processing
- **Logging**: Request logging and error tracking
- **HTTP Status**: Proper status codes (201 created, 400 validation, 404 not found, 500 error)

## Development Tips

- Check `server.log` for backend output
- Use browser DevTools Network tab to inspect API calls
- React DevTools browser extension helps debug component state
- Error messages display in the red banner at top of UI
- Database changes persist across restarts

## Features by Component

### NegotiationForm
- Validates required fields (case name)
- Numeric validation for damages amounts
- Creates new negotiation, resets form on success

### NegotiationDetail
- Inline editing of case details
- Inline edit of injury description with save button
- Toast confirmation notifications
- Spinner while saving
- Status change tracking
- Integrates BracketProposals and MediatorProposal components

### MoveTracker
- Add offers/demands with amount and notes
- Tracks party and move type
- Real-time analytics recalculation

### EvaluationPanel ✨ NEW
- **Add Case Evaluation**: Enter medical specials, economic/non-economic damages
- **Liability Assessment**: Set liability percentage (0-100%) using slider or input
- **Real-time Calculations**: Automatically calculates:
  - Total Damages (sum of all damage categories)
  - Adjusted Case Value (total damages × liability %)
  - Projected Settlement Range (60-90% of adjusted value)
- **Policy Limits**: Cap projections at policy limits
- **Visual Range Bar**: See settlement range with low/high markers
- **Evaluation Notes**: Add context and reasoning for evaluation
- **Edit Mode**: Click "Add Evaluation" or "Edit" to modify, "Save" to persist

### InsurerHistory ✨ NEW
- **Tabbed Interface**: Switch between Insurer and Adjuster analytics
- **Insurer Tab**: View historical statistics for the primary insurer
  - Case count and status breakdown
  - Avg settlement amount, settlement rate, avg duration
  - Avg policy limits and moves per case
  - List of past cases with this insurer
- **Adjuster Tab**: Analyze negotiation patterns for the adjuster
  - **Pattern Badges**: Visual indicators for detected styles
    - Aggressive Negotiator (first move <40%)
    - Quick Settler (avg duration <30 days)
    - Policy Limits Comfortable (settlements >80% of limit)
  - **Strategy Insights**: AI-powered recommendations based on patterns
  - **Move Analysis**: First move percentages and negotiation tendencies
  - List of past cases with move-by-move analysis

### BracketProposals
- Create alternative settlement ranges for plaintiff and defendant
- Visual range bars with gradient connectors
- Accept/reject bracket proposals
- Color-coded ranges (plaintiff: red, defendant: green)
- Status badges (active/accepted/rejected)
- Range validation (low < high)
- **Smart Suggestions**: Now prioritizes evaluation data when available

### MediatorProposal (NEW)
- Submit time-limited settlement proposals
- Real-time countdown timer (updates every second)
- Dual-party acceptance tracking (plaintiff + defendant)
- Status-based gradient backgrounds
- Replace existing proposals
- Automatic expiration detection
- Deadline validation (must be future date)

### AnalyticsDashboard ✨ ENHANCED
- **Case Evaluation Metrics Section** (NEW):
  - Total Damages breakdown
  - Liability Factor percentage
  - Adjusted Case Value (highlighted)
  - Projected Settlement Range (60-90% of adjusted value)
  - Policy Limit with utilization percentage
  - Warning badges when near policy limit (>80%)
- **Negotiation Analytics Section**:
  - Current Midpoint and Midpoint of Midpoints
  - Momentum (rate of convergence) with color coding
  - Convergence Rate (gap reduction progress)
  - Predicted Settlement amount
  - Confidence Score with reliability indicator
- **Evaluation vs Prediction Comparison** (NEW):
  - Visual comparison of predicted settlement vs evaluation range
  - Success/Warning/Info indicators
  - Strategic recommendations based on alignment

### SearchFilter
- Text search by case name, attorney names, mediator
- Filter by status, venue, defendant type

### PdfExport
- Code-split dynamic imports (jspdf, html2canvas)
- Reduces initial bundle size by ~155KB
- Loading state during PDF generation

## Code Quality & Tooling

- **ESLint**: Code linting for React and Node.js
- **Prettier**: Consistent code formatting
- **Code Splitting**: Dynamic imports for PDF libraries
- **Validation**: Server-side input validation and sanitization
- **Error Handling**: Comprehensive error messages and HTTP status codes

## Production Readiness

- ✅ User authentication with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Input validation and sanitization
- ✅ User isolation (users only see their own data)
- ✅ Code splitting for optimized bundle size
- ✅ Persistent SQLite database
- ✅ Comprehensive error handling
- ✅ Environment-specific configuration
- ✅ ESLint and Prettier configuration
- ✅ Responsive mobile-friendly design

## Known Limitations

- Single-party perspective (not multi-party mediations)
- No real-time collaboration (WebSockets)
- No email notifications for deadlines
- No file uploads for case documents

## Future Enhancements

- Case templates for common injury types
- Batch PDF export
- Email notifications for approaching deadlines
- Real-time collaboration (WebSockets)
- Settlement agreement generation
- File/document uploads
- Mobile app (React Native)
- Calendar integration
- Multi-party mediation support
- **server/database.js**: SQLite database management
- **server/calculations.js**: Analytics and prediction engine

### Frontend (React 18)
- **App.js**: Main application container
- **components/**: 8 reusable React components
- **styles/**: Responsive CSS styling

### Database (SQLite3)
- **negotiations**: Case information and participants
- **moves**: Demand/offer history
- **calculations**: Analytics and predictions

## API Endpoints

```
GET    /api/health                    - Health check
POST   /api/negotiations              - Create negotiation
GET    /api/negotiations              - List all negotiations
GET    /api/negotiations/:id          - Get negotiation with analytics
PUT    /api/negotiations/:id          - Update negotiation
DELETE /api/negotiations/:id          - Delete negotiation
POST   /api/moves                     - Add demand/offer
GET    /api/moves/:negotiation_id     - Get moves for negotiation
DELETE /api/moves/:id                 - Delete move
POST   /api/search                    - Search negotiations
GET    /api/analytics/:negotiation_id - Get analytics summary
```

## Configuration

The application uses default ports:
- **Backend**: http://localhost:5001
- **Frontend**: http://localhost:3000

To change ports, set the `PORT` environment variable for the server.
The frontend uses `REACT_APP_API_BASE_URL` to configure the API endpoint (defaults to `http://localhost:5001/api`).

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 5001 (backend)
lsof -i :5001

# Find process on port 3000 (frontend)
lsof -i :3000

# Kill process
kill -9 <PID>
```

### npm Install Errors
```bash
# Clear cache
npm cache clean --force

# Retry install
npm install
```

### SQLite Build Issues
```bash
# On macOS, may need Xcode Command Line Tools
xcode-select --install

# Retry npm install
npm install
```

### CORS Errors
Ensure backend is running on port 5001 and frontend on port 3000.
Verify `REACT_APP_API_BASE_URL` in `.env` points to `http://localhost:5001/api`.

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance

- Load times: < 2 seconds
- Move addition: < 500ms
- PDF export: < 3 seconds
- Search: < 100ms

## Development

```bash
# Start in development mode (with hot reload)
cd server && npm start
cd client && npm start
```

## License

ISC

## Support

For issues or questions, check the troubleshooting section or review logs:
- Backend logs appear in server terminal
- Frontend logs appear in browser console (F12)
