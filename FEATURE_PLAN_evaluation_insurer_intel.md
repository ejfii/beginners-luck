# Feature Plan: Evaluation & Insurer Intelligence

**Branch:** `feature/evaluation-and-insurer-intel`  
**Date Started:** December 7, 2025

## Overview
Add case evaluation tracking and insurer/adjuster historical intelligence to help attorneys make data-driven settlement decisions.

## Tasks

### Phase 1: Evaluation System
- [ ] Extend DB schema for evaluation fields on negotiations table
  - [ ] Add columns: `medical_specials`, `economic_damages`, `non_economic_damages`, `policy_limits`, `liability_percentage`, `evaluation_notes`
  - [ ] Create migration logic in `server/database.js`
- [ ] Update backend API validation for evaluation fields
  - [ ] Update `server/validation.js` to validate new fields
  - [ ] Update sanitization functions
- [ ] Create evaluation API endpoints
  - [ ] GET evaluation data with negotiation details
  - [ ] PUT/PATCH to update evaluation fields
- [ ] Build Evaluation UI panel in frontend
  - [ ] Create `client/src/components/EvaluationPanel.js`
  - [ ] Add money input fields for damages categories
  - [ ] Add liability percentage slider/input
  - [ ] Display calculated settlement range based on evaluation
  - [ ] Add notes section for evaluation rationale
- [ ] Add evaluation display to NegotiationDetail view
- [ ] Write tests for evaluation features
  - [ ] Backend API tests
  - [ ] Frontend component tests

### Phase 2: Insurer/Adjuster Intelligence
- [ ] Add insurer and adjuster fields to negotiations
  - [ ] Extend DB schema with `insurer_name`, `adjuster_name`
  - [ ] Update validation and sanitization
- [ ] Create aggregation endpoint for insurer/adjuster stats
  - [ ] GET `/api/analytics/insurer/:insurerName` - settlement patterns, avg times, ranges
  - [ ] GET `/api/analytics/adjuster/:adjusterName` - negotiation style, settlement tendencies
- [ ] Build "History with this Insurer/Adjuster" UI panel
  - [ ] Create `client/src/components/InsurerHistory.js`
  - [ ] Display past cases with same insurer/adjuster
  - [ ] Show average settlement amounts, timelines, move patterns
  - [ ] Highlight negotiation patterns (e.g., "typically moves 20% on first response")
- [ ] Add insurer/adjuster intelligence to NegotiationDetail view
- [ ] Write tests for intelligence features

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
