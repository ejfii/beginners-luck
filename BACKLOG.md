# Product Backlog – Negotiation Engine

> Last Updated: Based on README.md, IMPLEMENTATION_COMPLETE.md, and code analysis  
> **Total Items:** 18 (6 High, 7 Medium, 5 Low)

---

## 📊 Quick Summary

### Priority Breakdown
- **High Priority:** 6 items (critical for safe, effective PI practice)
- **Medium Priority:** 7 items (valuable enhancements, not blocking)
- **Low Priority:** 5 items (nice-to-have, experimental)

### Top 5 Most Impactful for Real PI Practice
1. **[Backend] Fix Bracket Ownership Verification** (High) – Security vulnerability
2. **[Backend] Email Notifications for Deadlines** (High) – Critical workflow support
3. **[Frontend] File/Document Upload Support** (High) – Essential for case management
4. **[Security] Production Environment Variable Validation** (High) – Deployment safety
5. **[Backend] Calendar Integration** (Medium) – Deadline management

---

## 🔴 High Priority
> Essential for safe, effective use in real PI practice

### [Backend] Fix Bracket Ownership Verification
- **Description:** Currently, bracket updates (PUT /api/brackets/:id) do not verify that the authenticated user owns the negotiation the bracket belongs to. This is a security issue allowing unauthorized bracket modifications. Add ownership check before allowing updates.
- **Labels:** `backend`, `security`, `bug`
- **Breaking change:** No
- **Priority:** High
- **Source:** TODO comment in `server/routes/brackets.js` line 95

---

### [Backend] Email Notifications for Deadlines and Events
- **Description:** Implement email alerts when mediation deadlines approach (e.g., 24h/48h warnings). Also send notifications to parties when the other party accepts/rejects proposals. Supports critical workflow needs for practicing attorneys managing multiple cases.
- **Labels:** `backend`, `integration`, `feature`
- **Breaking change:** No
- **Priority:** High
- **Source:** README.md Future Enhancements, IMPLEMENTATION_COMPLETE.md Next Steps

---

### [Frontend] File/Document Upload Support
- **Description:** Allow users to attach case documents, medical records, insurance correspondence, etc. to negotiations. Essential for real PI practice where case files contain dozens of supporting documents. Requires backend storage (local filesystem or S3), file type validation, and virus scanning considerations.
- **Labels:** `frontend`, `backend`, `feature`
- **Breaking change:** No
- **Priority:** High
- **Source:** README.md Future Enhancements, Known Limitations

---

### [Security] Production Environment Variable Validation
- **Description:** JWT_SECRET currently defaults to an insecure value if not set, with only a console warning. Add startup validation to prevent server from starting in production without proper environment configuration. Consider required vars: JWT_SECRET, NODE_ENV, DB_PATH, CORS_ORIGIN.
- **Labels:** `security`, `devops`, `enhancement`
- **Breaking change:** Yes (server won't start without proper config)
- **Priority:** High
- **Source:** Code analysis in `server/middleware/auth.js` line 10

---

### [Backend] Settlement Agreement Document Generation
- **Description:** Auto-generate a draft settlement agreement PDF when parties reach an accepted proposal. Should include case details, agreed-upon amounts, payment terms, and standard legal language. Saves attorneys 30-60 minutes of document preparation per settled case.
- **Labels:** `backend`, `feature`, `pdf-generation`
- **Breaking change:** No
- **Priority:** High
- **Source:** README.md Future Enhancements

---

### [Backend] Batch PDF Export
- **Description:** Allow exporting multiple negotiations to PDF in a single operation. Useful for end-of-quarter reporting, case reviews, or archiving closed files. Should include progress indicator for large batches and ZIP download option.
- **Labels:** `backend`, `feature`, `enhancement`
- **Breaking change:** No
- **Priority:** High
- **Source:** README.md Future Enhancements

---

## 🟡 Medium Priority
> Valuable enhancements, not blocking real usage

### [Backend] Calendar Integration (Google Calendar)
- **Description:** Sync mediation deadlines to user's Google Calendar with automatic reminders. Also export full case timeline (all moves, proposals, deadlines) to calendar. Improves deadline management without requiring users to manually track dates.
- **Labels:** `backend`, `integration`, `feature`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** README.md Future Enhancements, IMPLEMENTATION_COMPLETE.md Next Steps

---

### [Backend] Case Templates for Common Injury Types
- **Description:** Pre-populate negotiations with typical settlement structures for common PI cases (e.g., soft tissue, broken bone, TBI). Templates would include suggested bracket ranges, move patterns, and timeline defaults based on case type and jurisdiction.
- **Labels:** `backend`, `feature`, `enhancement`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** README.md Future Enhancements

---

### [Analytics] Advanced Analytics Dashboard
- **Description:** Add historical bracket comparison (see how current case compares to past similar cases), settlement probability scoring (ML-based prediction of settlement likelihood), and case outcome prediction (estimate final settlement range). Requires historical data collection and basic ML model.
- **Labels:** `analytics`, `backend`, `feature`, `ml`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** IMPLEMENTATION_COMPLETE.md Next Steps

---

### [Testing] Integration Test Suite for API Endpoints
- **Description:** Expand test coverage beyond unit tests. Add integration tests that verify full request/response cycles, authentication flows, and database state changes. Use supertest or similar framework. Target 80%+ coverage for critical API routes.
- **Labels:** `testing`, `quality`, `enhancement`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** Best practices analysis (implied need)

---

### [DevOps] Deployment Guide and Docker Support
- **Description:** Create comprehensive deployment documentation for common hosting providers (Heroku, DigitalOcean, AWS). Add Dockerfile and docker-compose.yml for containerized deployment. Include production checklist (environment vars, SSL, backups, monitoring).
- **Labels:** `devops`, `documentation`, `enhancement`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** Best practices analysis (production readiness)

---

### [Frontend] Enhanced Accessibility Audit
- **Description:** While recent improvements added ARIA labels and semantic HTML, conduct full WCAG 2.1 AA audit. Test with screen readers (NVDA, JAWS), ensure keyboard navigation works for all workflows, verify color contrast ratios, add skip links for power users.
- **Labels:** `frontend`, `accessibility`, `enhancement`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** Code analysis (recent improvements suggest ongoing priority)

---

### [Security] Audit Logging for Sensitive Operations
- **Description:** Log all authentication attempts, negotiation modifications, bracket updates, and deletions to audit trail. Include timestamp, user ID, IP address, and action details. Supports compliance requirements and forensic analysis if disputes arise.
- **Labels:** `backend`, `security`, `feature`
- **Breaking change:** No
- **Priority:** Medium
- **Source:** Best practices analysis (production security)

---

## 🟢 Low Priority
> Nice-to-have, experimental, or long-term vision

### [Real-time] WebSocket Collaboration Features
- **Description:** Add real-time updates so users see live changes when the other party views, responds, or updates proposals. Show online/offline presence indicators. Requires WebSocket server (Socket.io) and refactoring frontend to handle live data streams.
- **Labels:** `backend`, `frontend`, `feature`, `websockets`
- **Breaking change:** No (additive feature)
- **Priority:** Low
- **Source:** README.md Future Enhancements (Known Limitation), IMPLEMENTATION_COMPLETE.md Next Steps

---

### [Mobile] React Native Mobile App
- **Description:** Build native iOS/Android app using React Native. Share business logic with web client. Add push notifications for deadlines and proposal updates. Requires mobile-specific UX design, app store deployment, and ongoing mobile platform maintenance.
- **Labels:** `mobile`, `feature`, `react-native`
- **Breaking change:** No
- **Priority:** Low
- **Source:** README.md Future Enhancements, IMPLEMENTATION_COMPLETE.md Next Steps

---

### [Frontend] Multi-Party Mediation Support
- **Description:** Extend system beyond two-party negotiations to support cases with multiple defendants, multiple plaintiffs, or insurance carriers as separate parties. Requires significant data model changes (n-party bracket proposals, complex acceptance rules) and UI redesign.
- **Labels:** `frontend`, `backend`, `feature`, `breaking`
- **Breaking change:** Yes (data model changes)
- **Priority:** Low
- **Source:** README.md Future Enhancements, Known Limitations

---

### [Backend] Import/Export Case Data (JSON/CSV)
- **Description:** Allow bulk import of cases from CSV (e.g., from case management software) and export full database to JSON for backup or migration. Supports users transitioning from other tools or managing data across systems.
- **Labels:** `backend`, `feature`, `enhancement`
- **Breaking change:** No
- **Priority:** Low
- **Source:** Implied need (export endpoint exists, import would complete the feature)

---

### [Blue Sky] AI-Powered Settlement Recommendations
- **Description:** Experimental feature using LLM or ML model to analyze case facts, injury type, jurisdiction, and historical data to suggest optimal bracket ranges and negotiation strategy. Requires significant data science work, ethical/legal review, and user research to ensure recommendations don't override attorney judgment.
- **Labels:** `ml`, `research`, `blue-sky`
- **Breaking change:** No
- **Priority:** Low
- **Source:** Extrapolation from Advanced Analytics idea

---

## 📝 Implementation Notes

### Breaking Changes
- **Production Environment Validation:** Will prevent server start without proper JWT_SECRET and other critical env vars
- **Multi-Party Mediation:** Requires database schema changes, API contract updates, frontend refactor

### Estimated Complexity (Rough T-shirt sizes)
- **XS (1-2 days):** Bracket ownership fix, env var validation
- **S (3-5 days):** Audit logging, case templates
- **M (1-2 weeks):** Email notifications, calendar integration, batch PDF export, file uploads
- **L (2-4 weeks):** Settlement agreement generation, advanced analytics dashboard, integration tests
- **XL (1-2 months):** Real-time collaboration (WebSockets), mobile app, multi-party mediation
- **XXL (3+ months):** AI-powered recommendations (requires research phase)

### Dependencies
- **Email Notifications** requires: SMTP service setup (SendGrid, Mailgun, AWS SES)
- **Calendar Integration** requires: Google OAuth2 setup, API credentials
- **File Uploads** requires: Storage solution decision (local vs S3), virus scanning strategy
- **Real-time Collaboration** requires: WebSocket infrastructure (Socket.io server, Redis for scaling)
- **Mobile App** requires: React Native setup, app store accounts, mobile CI/CD pipeline
- **Advanced Analytics** requires: Historical data collection period (6-12 months), ML model training pipeline

### Quick Wins (High Impact, Low Effort)
1. **Bracket Ownership Fix** (XS) – Closes security hole
2. **Environment Validation** (XS) – Prevents production misconfigurations
3. **Audit Logging** (S) – Adds compliance support with minimal complexity

### Recommended Next Sprint (Focused on Production Readiness)
1. Fix bracket ownership verification (security)
2. Add production environment validation (devops)
3. Implement email notifications (critical workflow)
4. Add file upload support (essential for practice)

---

## 🎯 Success Metrics

Track these KPIs after implementing high-priority items:
- **Security:** Zero unauthorized bracket modifications detected
- **Email Notifications:** 90%+ email delivery rate, 50%+ reduction in missed deadlines
- **File Uploads:** Average 5-10 documents per case uploaded
- **Production Readiness:** Zero production incidents due to misconfiguration
- **User Satisfaction:** Survey attorneys after 30 days of usage

---

## 📚 References
- `README.md` – Future Enhancements (line 369+), Known Limitations
- `IMPLEMENTATION_COMPLETE.md` – Next Steps (lines 231-250)
- Code TODOs: `server/routes/brackets.js` line 95, `server/middleware/auth.js` line 10
