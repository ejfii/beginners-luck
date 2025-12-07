# Feature Plan: Evaluation & Insurer Intelligence

**Branch:** `feature/evaluation-and-insurer-intel`  
**Date Started:** December 7, 2025

## Overview
Add case evaluation tracking and insurer/adjuster historical intelligence to help attorneys make data-driven settlement decisions.

## Tasks

### Phase 1: Evaluation System ✅ COMPLETE
- [x] Extend DB schema for evaluation fields on negotiations table
  - [x] Add columns: `medical_specials`, `economic_damages`, `non_economic_damages`, `policy_limits`, `liability_percentage`, `evaluation_notes`
  - [x] Create migration logic in `server/database.js`
- [x] Update backend API validation for evaluation fields
  - [x] Update `server/validation.js` to validate new fields
  - [x] Update sanitization functions
- [x] Create evaluation API endpoints
  - [x] GET evaluation data with negotiation details (existing endpoint returns new fields)
  - [x] PUT/PATCH to update evaluation fields (existing endpoint accepts new fields)
- [x] Build Evaluation UI panel in frontend
  - [x] Create `client/src/components/EvaluationPanel.js`
  - [x] Add money input fields for damages categories
  - [x] Add liability percentage slider/input
  - [x] Display calculated settlement range based on evaluation
  - [x] Add notes section for evaluation rationale
- [x] Add evaluation display to NegotiationDetail view
- [ ] Write tests for evaluation features
  - [ ] Backend API tests (manual testing complete)
  - [ ] Frontend component tests

### Phase 2: Insurer/Adjuster Intelligence ✅ COMPLETE
- [x] Add insurer and adjuster fields to negotiations
  - [x] Fields already existed: `primary_insurer_name`, `primary_adjuster_name`, etc.
  - [x] Validation and sanitization already in place
- [x] Create aggregation endpoint for insurer/adjuster stats
  - [x] GET `/api/analytics/insurer/:insurerName` - settlement patterns, avg times, ranges
  - [x] GET `/api/analytics/adjuster/:adjusterName` - negotiation style, settlement tendencies
- [x] Build "History with this Insurer/Adjuster" UI panel
  - [x] Create `client/src/components/InsurerHistory.js`
  - [x] Display past cases with same insurer/adjuster
  - [x] Show average settlement amounts, timelines, move patterns
  - [x] Highlight negotiation patterns (aggressive negotiator, quick settler, policy comfortable)
- [x] Add insurer/adjuster intelligence to NegotiationDetail view
- [ ] Write tests for intelligence features (manual testing complete)

### Phase 3: Integration & Polish
- [ ] Integrate evaluation with bracket suggestions
  - [ ] Update `server/bracketSuggestion.js` to consider evaluation data
  - [ ] Use policy limits as ceiling for suggestions
  - [ ] Factor in liability percentage
- [ ] Add evaluation-based analytics to dashboard
  - [ ] Show cases with high evaluation vs low offers (negotiation gap)
  - [ ] Highlight cases near policy limits
- [ ] Update documentation
  - [ ] Update README.md with new features
  - [ ] Add API documentation for new endpoints
- [ ] Final testing and bug fixes

## Notes
- Keep backward compatibility - all new fields should be optional
- Use money.js utilities for all currency inputs
- Follow existing patterns for UI styling and component structure
- Ensure proper input validation and sanitization for security

## Success Criteria
- [ ] Attorneys can input and track case evaluations with multiple damage categories
- [ ] System displays historical settlement data for specific insurers/adjusters
- [ ] Bracket suggestions incorporate evaluation data and policy limits
- [ ] All features are tested and documented
- [ ] No breaking changes to existing functionality
