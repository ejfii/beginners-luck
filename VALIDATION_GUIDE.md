# Validation System - Developer Guide

## Overview
The negotiation engine now has a robust validation system with field-level error reporting and realistic upper bounds. This guide explains how to use it.

---

## Backend Validation

### Constants (server/validation.js)
```javascript
MAX_MONEY_VALUE = 1,000,000,000  // $1 billion
MAX_STRING_LENGTH = 255          // Short strings (names, etc.)
MAX_LONG_TEXT_LENGTH = 5,000    // Long text (notes, descriptions)
```

### Validation Functions

All validation functions return:
```javascript
{
  isValid: boolean,
  errors: {
    fieldName: 'Error message',
    anotherField: 'Another error'
  }
}
```

#### Available Validators:
- `validateNegotiationCreate(data)` - Full negotiation validation
- `validateNegotiationUpdate(data)` - Partial update validation
- `validateNegotiation(data)` - Generic negotiation validation
- `validateMove(data)` - Move validation
- `validateBracket(data)` - Bracket validation  
- `validateMediatorProposal(data)` - Mediator proposal validation
- `validateParty(data)` - Party validation (NEW)

#### Example Usage in Routes:
```javascript
const { validateNegotiationCreate, sanitizeNegotiation } = require('../validation');

router.post('/', (req, res) => {
  // Validate
  const validation = validateNegotiationCreate(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: validation.errors  // Field-level errors
    });
  }
  
  // Sanitize
  const sanitized = sanitizeNegotiation(req.body);
  
  // Use sanitized data
  db.createNegotiation(sanitized, (err, result) => {
    // ...
  });
});
```

### What Gets Validated:

**Money Fields** (checked for positive value and < $1 billion):
- All medical bills, coverage limits, settlement goals
- Move amounts, bracket amounts, mediator proposal amounts

**String Fields** (checked for type and < 255 chars):
- Names, attorneys, insurers, adjusters, mediators, judges, venues
- Party names, attorney names, law firm names

**Long Text Fields** (checked for type and < 5,000 chars):
- Injury descriptions, notes fields

**Required Fields**:
- Negotiation: name (case name)
- Move: negotiation_id, party, type, amount
- Bracket: negotiation_id, plaintiff_amount, defendant_amount
- Mediator Proposal: negotiation_id, amount, deadline (must be future date)
- Party: negotiation_id, role, party_name

---

## Frontend Validation

### Importing Utilities (client/src/utils/validation.js)

```javascript
import { 
  validateRequired,
  validateMoneyAmount,
  validateStringLength,
  validateEmail,
  validateFutureDate,
  extractFieldErrors,
  getFieldError,
  VALIDATION_CONSTANTS
} from '../utils/validation';
```

### Client-Side Validation Functions

#### `validateRequired(value, fieldName)`
```javascript
const error = validateRequired(formData.name, 'Case name');
if (error) errors.name = error;
```

#### `validateMoneyAmount(amount)`
```javascript
const error = validateMoneyAmount(formData.settlement_goal);
if (error) errors.settlement_goal = error;
// Returns null if valid, or error message:
// - "Amount is required"
// - "Amount must be a valid number"
// - "Amount must be greater than 0"
// - "Amount must be less than $1,000,000,000"
```

#### `validateStringLength(value, maxLength, fieldName)`
```javascript
const error = validateStringLength(
  formData.name, 
  VALIDATION_CONSTANTS.MAX_STRING_LENGTH,
  'Case name'
);
if (error) errors.name = error;
```

#### `validateEmail(email)`
```javascript
const error = validateEmail(formData.email);
if (error) errors.email = error;
```

#### `validateFutureDate(dateString)`
```javascript
const error = validateFutureDate(formData.deadline);
if (error) errors.deadline = error;
```

### Handling API Errors

```javascript
import { extractFieldErrors } from '../utils/validation';

axios.post('/api/negotiations', data)
  .catch(err => {
    const fieldErrors = extractFieldErrors(err.response?.data);
    setErrors(fieldErrors);
    // fieldErrors = { name: 'error msg', settlement_goal: 'error msg' }
  });
```

### ErrorMessage Component

```javascript
import ErrorMessage from './ErrorMessage';

// In your JSX:
<div className="form-group">
  <label>Case Name *</label>
  <input
    type="text"
    name="name"
    value={formData.name}
    onChange={handleChange}
    className={errors.name ? 'error' : ''}
  />
  <ErrorMessage error={errors.name} />
</div>
```

### Complete Form Validation Example

```javascript
const validateForm = () => {
  const newErrors = {};
  
  // Required field
  const nameError = validateRequired(formData.name, 'Case name');
  if (nameError) newErrors.name = nameError;
  
  // String length
  const nameLengthError = validateStringLength(
    formData.name, 
    VALIDATION_CONSTANTS.MAX_STRING_LENGTH,
    'Case name'
  );
  if (nameLengthError) newErrors.name = nameLengthError;
  
  // Money amounts
  if (formData.settlement_goal) {
    const goalError = validateMoneyAmount(formData.settlement_goal);
    if (goalError) newErrors.settlement_goal = goalError;
  }
  
  return newErrors;
};

const handleSubmit = (e) => {
  e.preventDefault();
  const newErrors = validateForm();
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  // Submit form
  axios.post('/api/negotiations', formData)
    .then(...)
    .catch(err => {
      const apiErrors = extractFieldErrors(err.response?.data);
      setErrors(apiErrors);
    });
};
```

---

## Error Handling

### Backend Error Handler (server/middleware/errorHandler.js)

The enhanced error handler automatically:
- Logs request context (user, path, method, timestamp, IP)
- Distinguishes validation errors (400) from server errors (500)
- Shows full stack traces for server errors
- Returns consistent error format

### Error Response Format

**Validation Error (400)**:
```json
{
  "error": "Validation failed",
  "status": 400,
  "details": {
    "name": "Case name is required",
    "settlement_goal": "Amount must be less than $1,000,000,000"
  }
}
```

**Server Error (500)** - Development Only:
```json
{
  "error": "Database connection failed",
  "status": 500,
  "stack": "Error: Database connection failed\n    at ..."
}
```

**Server Error (500)** - Production:
```json
{
  "error": "Internal Server Error",
  "status": 500
}
```

---

## Testing Validation

### Manual Testing Checklist

**Money Fields**:
- [ ] Try entering -100 → Should fail
- [ ] Try entering 0 → Should fail (most fields)
- [ ] Try entering 1000000000 → Should pass
- [ ] Try entering 2000000000 → Should fail (exceeds limit)
- [ ] Try entering "abc" → Should fail

**String Fields**:
- [ ] Leave required fields empty → Should fail
- [ ] Enter 256 characters → Should fail
- [ ] Enter 255 characters → Should pass

**Long Text Fields**:
- [ ] Enter 5001 characters → Should fail
- [ ] Enter 5000 characters → Should pass

### Automated Testing (When Implemented)

```javascript
// Example Jest test
describe('validateNegotiationCreate', () => {
  it('should reject settlement_goal over $1 billion', () => {
    const data = {
      name: 'Test Case',
      settlement_goal: 2000000000
    };
    
    const result = validateNegotiationCreate(data);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.settlement_goal).toContain('less than');
  });
});
```

---

## Common Patterns

### Updating an Existing Form

1. Import validation utilities
2. Add validation to existing `validateForm()` function
3. Replace `<span className="error-text">` with `<ErrorMessage>` component
4. Handle API errors with `extractFieldErrors()`

### Creating a New Form

1. Use `NegotiationForm.js` as a template
2. Import validation utilities and ErrorMessage
3. Create state: `const [errors, setErrors] = useState({})`
4. Validate before submit
5. Display errors with `<ErrorMessage error={errors.fieldName} />`

### Adding a New Backend Validation Function

1. Add function to `server/validation.js`
2. Use object-based errors: `errors.fieldName = 'message'`
3. Check upper bounds with constants
4. Return `{ isValid: Object.keys(errors).length === 0, errors }`
5. Export function in module.exports
6. Use in route handler

---

## Troubleshooting

**Problem**: Frontend validation passes but backend rejects
- **Solution**: Ensure constants match between frontend and backend

**Problem**: Errors not displaying in form
- **Solution**: Check that error keys match input field names

**Problem**: Can't see detailed error logs
- **Solution**: Check console for server errors, ensure middleware is applied

**Problem**: Validation too strict
- **Solution**: Adjust constants in both frontend and backend validation files

---

## Migration Guide (For Existing Forms)

If you have forms not yet using the new validation system:

**Step 1**: Import new utilities
```javascript
import { validateRequired, validateMoneyAmount, VALIDATION_CONSTANTS } from '../utils/validation';
import ErrorMessage from './ErrorMessage';
```

**Step 2**: Update validation function
```javascript
// OLD
const validateForm = () => {
  const errors = [];
  if (!name) errors.push('Name is required');
  return errors;
};

// NEW
const validateForm = () => {
  const errors = {};
  const nameError = validateRequired(name, 'Name');
  if (nameError) errors.name = nameError;
  return errors;
};
```

**Step 3**: Replace error displays
```javascript
// OLD
{errors.length > 0 && <div>{errors.join(', ')}</div>}

// NEW
<ErrorMessage error={errors.name} />
<ErrorMessage error={errors.amount} />
```

**Step 4**: Handle API errors
```javascript
// OLD
.catch(err => setError(err.response?.data?.error))

// NEW
.catch(err => setErrors(extractFieldErrors(err.response?.data)))
```

---

## Reference Links

- Backend validation: `server/validation.js`
- Frontend validation: `client/src/utils/validation.js`
- Error component: `client/src/components/ErrorMessage.js`
- Error handler: `server/middleware/errorHandler.js`
- Example form: `client/src/components/NegotiationForm.js`

---

*Last Updated: Phase 1 Completion*
