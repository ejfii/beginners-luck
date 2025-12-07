# Phase 2 - Enhance Core Features

## Objective
Build on the stable foundation from Phase 1 to add advanced features that improve negotiation efficiency and user experience.

---

## Tasks Overview

### 1. Batch Operations for Moves and Brackets 🎯
**Priority**: HIGH  
**Estimated Time**: 2-3 hours

**Goal**: Allow users to create/edit/delete multiple moves or brackets at once.

**Backend Work**:
- `POST /api/negotiations/:id/moves/batch` - Create multiple moves
- `PUT /api/negotiations/:id/moves/batch` - Update multiple moves
- `DELETE /api/negotiations/:id/moves/batch` - Delete multiple moves
- Similar endpoints for brackets
- Transaction support to ensure all-or-nothing operations

**Frontend Work**:
- Multi-select UI in MoveTracker
- Bulk edit modal
- Bulk delete confirmation
- Progress indicators for batch operations

**Value**: Save time when managing complex negotiations with many moves.

---

### 2. Negotiation Templates 📋
**Priority**: HIGH  
**Estimated Time**: 3-4 hours

**Goal**: Save and reuse common negotiation setups (e.g., "Auto Accident", "Premises Liability").

**Backend Work**:
- New `templates` table: `id, user_id, name, template_data (JSON), created_at`
- `POST /api/templates` - Save negotiation as template
- `GET /api/templates` - List user's templates
- `POST /api/negotiations/from-template/:templateId` - Create negotiation from template
- `DELETE /api/templates/:id` - Delete template

**Frontend Work**:
- "Save as Template" button in NegotiationDetail
- "Create from Template" option in NegotiationForm
- Template management view (list, delete, rename)
- Template preview before creating negotiation

**Value**: Drastically reduce setup time for similar cases.

---

### 3. Advanced Search and Filtering 🔍
**Priority**: MEDIUM  
**Estimated Time**: 2-3 hours

**Goal**: Find negotiations quickly by any field (parties, amounts, dates, status).

**Backend Work**:
- Enhance `GET /api/negotiations` with query parameters:
  - `?search=` - Full-text search across case name, parties, notes
  - `?party=` - Filter by party name (plaintiff or defendant)
  - `?min_amount=` & `?max_amount=` - Filter by settlement range
  - `?status=` - Filter by status (open, settled, archived)
  - `?date_from=` & `?date_to=` - Filter by creation date
  - `?insurer=` - Filter by insurance company
  - `?sort=` - Sort by field (created_at, name, settlement_goal, etc.)

**Frontend Work**:
- Enhance SearchFilter component with:
  - Amount range sliders
  - Date range picker
  - Status dropdown
  - Party/insurer autocomplete
  - Sort options
- Save filter presets
- Clear all filters button

**Value**: Quickly locate specific cases in large caseloads.

---

### 4. Activity Timeline and History 📅
**Priority**: MEDIUM  
**Estimated Time**: 3-4 hours

**Goal**: Track all changes to a negotiation with timestamps and user attribution.

**Backend Work**:
- New `activity_log` table: `id, negotiation_id, user_id, action, entity_type, entity_id, old_value, new_value, timestamp`
- Middleware to automatically log changes on:
  - Negotiation edits
  - Move creation/deletion
  - Bracket creation/deletion
  - Mediator proposal changes
  - Party changes
- `GET /api/negotiations/:id/activity` - Get activity timeline

**Frontend Work**:
- Timeline view in NegotiationDetail (collapsible panel)
- Activity entries showing:
  - What changed
  - Who made the change
  - When it happened
  - Old vs. new values (for edits)
- Filter timeline by action type
- Export timeline as PDF

**Value**: Audit trail for accountability and case review.

---

### 5. Negotiation Status Workflow 🔄
**Priority**: MEDIUM  
**Estimated Time**: 2 hours

**Goal**: Formal status tracking (Draft → Active → In Mediation → Settled/Dismissed).

**Backend Work**:
- Add `status` field to negotiations table (default: 'draft')
- Add `status_changed_at` timestamp
- Validation: Only allow valid status transitions
- `PATCH /api/negotiations/:id/status` - Update status
- Filter negotiations by status in listing endpoint

**Frontend Work**:
- Status badge in NegotiationList
- Status dropdown in NegotiationDetail
- Confirmation dialog for status changes
- Color-coded status indicators
- Dashboard stats by status

**Value**: Clear visibility into case progression.

---

### 6. Collaborative Notes and Comments 💬
**Priority**: LOW  
**Estimated Time**: 2-3 hours

**Goal**: Allow team members to add comments/notes on specific moves, brackets, or the overall negotiation.

**Backend Work**:
- New `comments` table: `id, negotiation_id, entity_type, entity_id, user_id, comment_text, created_at`
- `POST /api/negotiations/:id/comments` - Add comment
- `GET /api/negotiations/:id/comments` - Get all comments
- `DELETE /api/comments/:id` - Delete comment (owner only)

**Frontend Work**:
- Comment icon/counter on moves and brackets
- Comment modal/panel
- Display comments with timestamps and user
- Real-time comment count updates

**Value**: Team collaboration and case notes.

---

### 7. CSV Import/Export 📊
**Priority**: LOW  
**Estimated Time**: 2 hours

**Goal**: Import negotiations from spreadsheet, export to CSV for analysis.

**Backend Work**:
- `POST /api/negotiations/import-csv` - Parse CSV and create negotiations
- `GET /api/negotiations/export-csv` - Export all negotiations to CSV
- CSV format specification documented
- Validation for CSV imports

**Frontend Work**:
- CSV upload component with drag-and-drop
- Preview imported data before creation
- Error handling for invalid CSV
- Download CSV button in NegotiationList
- Column mapping UI

**Value**: Data portability and bulk case creation.

---

### 8. Dashboard Widgets and Customization 📈
**Priority**: LOW  
**Estimated Time**: 2-3 hours

**Goal**: Customizable dashboard with key metrics and quick actions.

**Backend Work**:
- New `user_preferences` table: `user_id, dashboard_layout (JSON), theme, default_sort`
- `GET /api/users/preferences` - Get user preferences
- `PUT /api/users/preferences` - Update preferences
- Dashboard metrics endpoint: `GET /api/dashboard/stats`

**Frontend Work**:
- Drag-and-drop dashboard layout
- Widget library:
  - Active negotiations count
  - Average settlement time
  - Recent activity feed
  - Upcoming mediation deadlines
  - Settlement value trends
- Save/reset layout
- Dark mode toggle

**Value**: Personalized workflow and quick insights.

---

## Implementation Order (Recommended)

1. **Negotiation Templates** (HIGH - Most requested, high value)
2. **Batch Operations** (HIGH - Time-saver for power users)
3. **Advanced Search** (MEDIUM - Important as caseload grows)
4. **Status Workflow** (MEDIUM - Quick win, adds polish)
5. **Activity Timeline** (MEDIUM - Audit trail for compliance)
6. **CSV Import/Export** (LOW - Nice to have)
7. **Collaborative Notes** (LOW - Team feature)
8. **Dashboard Customization** (LOW - Polish feature)

---

## Success Metrics

- **Templates**: Reduce negotiation creation time by 50%
- **Batch Operations**: Handle 10+ moves/brackets in single action
- **Search**: Find any case in < 5 seconds
- **Timeline**: Complete audit trail for all changes
- **Status**: Clear workflow visibility
- **CSV**: Import 100+ negotiations in < 1 minute

---

## Next Steps

1. Choose which features to implement first
2. Create database migrations for new tables
3. Implement backend endpoints with tests
4. Build frontend components
5. User testing and refinement

---

*Ready to start with Negotiation Templates (highest priority)?*
