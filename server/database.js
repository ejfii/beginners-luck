const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use test database in test environment
const DB_FILE = process.env.NODE_ENV === 'test' 
  ? 'negotiations.test.db' 
  : (process.env.DB_FILE || 'negotiations.db');
const DB_PATH = path.join(__dirname, DB_FILE);

// Keep a persistent connection
let dbConnection = null;

/**
 * Get or create persistent database connection
 */
function getConnection() {
  if (!dbConnection) {
    dbConnection = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        dbConnection = null;
      } else {
        // Enable foreign key constraints
        dbConnection.run('PRAGMA foreign_keys = ON', (err) => {
          if (err) {
            console.error('Error enabling foreign keys:', err);
          }
        });
      }
    });
  }
  return dbConnection;
}

/**
 * Create a new user with hashed password
 */
function createUser(userData, callback) {
  const db = getConnection();
  const { username, password_hash } = userData;
  const created_date = new Date().toISOString();

  db.run(
    'INSERT INTO users (username, password_hash, created_date) VALUES (?, ?, ?)',
    [username, password_hash, created_date],
    function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, username, created_date });
      }
    }
  );
}

/**
 * Get user by username (for login)
 */
function getUserByUsername(username, callback) {
  const db = getConnection();
  db.get(
    'SELECT id, username, password_hash FROM users WHERE username = ?',
    [username],
    (err, row) => {
      callback(err, row);
    }
  );
}

/**
 * Initialize database and create tables if they don't exist
 */
function initializeDatabase(callback) {
  const db = getConnection();

  db.serialize(() => {
    // Users table (must be created before negotiations)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_date TEXT NOT NULL
      )
    `, (err) => {
      if (err) console.error('Error creating users table:', err);
    });

    // Negotiations table
    db.run(`
      CREATE TABLE IF NOT EXISTS negotiations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_date TEXT,
        updated_date TEXT,
        plaintiff_attorney TEXT,
        defendant_attorney TEXT,
        mediator TEXT,
        venue TEXT,
        judge TEXT,
        coverage TEXT,
        primary_coverage_limit REAL,
        primary_insurer_name TEXT,
        primary_adjuster_name TEXT,
        umbrella_coverage_limit REAL,
        umbrella_insurer_name TEXT,
        umbrella_adjuster_name TEXT,
        uim_coverage_limit REAL,
        uim_insurer_name TEXT,
        uim_adjuster_name TEXT,
        defendant_type TEXT,
        injury_description TEXT,
        past_medical_bills REAL,
        future_medical_bills REAL,
        lcp REAL,
        lost_wages REAL,
        loss_earning_capacity REAL,
        status TEXT DEFAULT 'active',
        deleted_at TEXT,
        settlement_goal REAL,
        notes TEXT,
        medical_specials REAL,
        economic_damages REAL,
        non_economic_damages REAL,
        policy_limits REAL,
        liability_percentage REAL,
        evaluation_notes TEXT,
        jury_damages_likelihood REAL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating negotiations table:', err);
      } else {
        // Migrate existing table if needed - add new columns if they don't exist
        db.all("PRAGMA table_info(negotiations)", [], (err, columns) => {
          if (err) {
            console.error('Error checking table schema:', err);
            return;
          }
          
          const columnNames = columns.map(col => col.name);
          const newColumns = [
            { name: 'primary_coverage_limit', type: 'REAL' },
            { name: 'primary_insurer_name', type: 'TEXT' },
            { name: 'primary_adjuster_name', type: 'TEXT' },
            { name: 'umbrella_coverage_limit', type: 'REAL' },
            { name: 'umbrella_insurer_name', type: 'TEXT' },
            { name: 'umbrella_adjuster_name', type: 'TEXT' },
            { name: 'uim_coverage_limit', type: 'REAL' },
            { name: 'uim_insurer_name', type: 'TEXT' },
            { name: 'uim_adjuster_name', type: 'TEXT' },
            { name: 'deleted_at', type: 'TEXT' },
            // Evaluation fields
            { name: 'medical_specials', type: 'REAL' },
            { name: 'economic_damages', type: 'REAL' },
            { name: 'non_economic_damages', type: 'REAL' },
            { name: 'policy_limits', type: 'REAL' },
            { name: 'liability_percentage', type: 'REAL' },
            { name: 'evaluation_notes', type: 'TEXT' },
            { name: 'jury_damages_likelihood', type: 'REAL' }
          ];
          
          newColumns.forEach(col => {
            if (!columnNames.includes(col.name)) {
              db.run(`ALTER TABLE negotiations ADD COLUMN ${col.name} ${col.type}`, (err) => {
                if (err) {
                  console.error(`Error adding column ${col.name}:`, err);
                } else {
                  console.log(`✓ Added column ${col.name} to negotiations table`);
                }
              });
            }
          });
        });
      }
    });

    // Parties table - Multiple plaintiffs and defendants per negotiation
    db.run(`
      CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negotiation_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('plaintiff', 'defendant')),
        party_name TEXT NOT NULL,
        attorney_name TEXT,
        law_firm_name TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating parties table:', err);
      } else {
        // Migrate existing single attorney fields to parties table
        db.all(`SELECT id, plaintiff_attorney, defendant_attorney FROM negotiations 
                WHERE (plaintiff_attorney IS NOT NULL AND plaintiff_attorney != '') 
                OR (defendant_attorney IS NOT NULL AND defendant_attorney != '')`, [], (err, negotiations) => {
          if (err) {
            console.error('Error fetching negotiations for party migration:', err);
            return;
          }
          
          if (negotiations && negotiations.length > 0) {
            const now = new Date().toISOString();
            negotiations.forEach(neg => {
              // Check if parties already exist for this negotiation
              db.get('SELECT COUNT(*) as count FROM parties WHERE negotiation_id = ?', [neg.id], (err, row) => {
                if (err || !row || row.count > 0) return; // Skip if error or already migrated
                
                // Migrate plaintiff attorney
                if (neg.plaintiff_attorney && neg.plaintiff_attorney.trim()) {
                  db.run(
                    'INSERT INTO parties (negotiation_id, role, party_name, attorney_name, created_at) VALUES (?, ?, ?, ?, ?)',
                    [neg.id, 'plaintiff', 'Plaintiff', neg.plaintiff_attorney, now],
                    (err) => {
                      if (err) console.error('Error migrating plaintiff attorney:', err);
                      else console.log(`✓ Migrated plaintiff attorney for negotiation ${neg.id}`);
                    }
                  );
                }
                
                // Migrate defendant attorney
                if (neg.defendant_attorney && neg.defendant_attorney.trim()) {
                  db.run(
                    'INSERT INTO parties (negotiation_id, role, party_name, attorney_name, created_at) VALUES (?, ?, ?, ?, ?)',
                    [neg.id, 'defendant', 'Defendant', neg.defendant_attorney, now],
                    (err) => {
                      if (err) console.error('Error migrating defendant attorney:', err);
                      else console.log(`✓ Migrated defendant attorney for negotiation ${neg.id}`);
                    }
                  );
                }
              });
            });
          }
        });
      }
    });

    // Moves table
    db.run(`
      CREATE TABLE IF NOT EXISTS moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negotiation_id INTEGER NOT NULL,
        timestamp TEXT,
        party TEXT,
        type TEXT,
        amount REAL,
        notes TEXT,
        FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating moves table:', err);
    });

    // Calculations table
    db.run(`
      CREATE TABLE IF NOT EXISTS calculations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negotiation_id INTEGER NOT NULL,
        move_id INTEGER,
        midpoint REAL,
        midpoint_of_midpoints REAL,
        momentum REAL,
        predicted_settlement REAL,
        created_at TEXT,
        FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE,
        FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error('Error creating calculations table:', err);
    });

    // Brackets table - Alternative bracket proposals (single-value model)
    // Each bracket proposes: "Plaintiff will be at X if Defendant is at Y"
    // Now supports both plaintiff and defendant proposals
    db.run(`
      CREATE TABLE IF NOT EXISTS brackets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negotiation_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        plaintiff_amount REAL NOT NULL,
        defendant_amount REAL NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'active',
        proposed_by TEXT DEFAULT 'plaintiff' CHECK(proposed_by IN ('plaintiff', 'defendant')),
        FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating brackets table:', err);
      } else {
        // Migrate existing brackets table to add proposed_by column if it doesn't exist
        db.all("PRAGMA table_info(brackets)", [], (err, columns) => {
          if (err) {
            console.error('Error checking brackets schema:', err);
            return;
          }
          
          const columnNames = columns.map(col => col.name);
          if (!columnNames.includes('proposed_by')) {
            console.log('Adding proposed_by column to brackets table...');
            db.run(`ALTER TABLE brackets ADD COLUMN proposed_by TEXT DEFAULT 'plaintiff' CHECK(proposed_by IN ('plaintiff', 'defendant'))`, (err) => {
              if (err) {
                console.error('Error adding proposed_by column:', err);
              } else {
                console.log('Successfully added proposed_by column to brackets table');
              }
            });
          }
        });
      }
    });

    // Mediator proposals table - One active proposal per negotiation
    db.run(`
      CREATE TABLE IF NOT EXISTS mediator_proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        negotiation_id INTEGER NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        amount REAL NOT NULL,
        deadline TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        plaintiff_response TEXT,
        defendant_response TEXT,
        FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating mediator_proposals table:', err);
      }

      // Create indexes on foreign key columns for better query performance
      db.run('CREATE INDEX IF NOT EXISTS idx_negotiations_user_id ON negotiations(user_id)', (err) => {
        if (err) console.error('Error creating index on negotiations.user_id:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_parties_negotiation_id ON parties(negotiation_id)', (err) => {
        if (err) console.error('Error creating index on parties.negotiation_id:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_moves_negotiation_id ON moves(negotiation_id)', (err) => {
        if (err) console.error('Error creating index on moves.negotiation_id:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_brackets_negotiation_id ON brackets(negotiation_id)', (err) => {
        if (err) console.error('Error creating index on brackets.negotiation_id:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_mediator_proposals_negotiation_id ON mediator_proposals(negotiation_id)', (err) => {
        if (err) console.error('Error creating index on mediator_proposals.negotiation_id:', err);
      });
    });

    // Templates table - Save negotiation configurations for reuse
    db.run(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        template_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating templates table:', err);
      }

      db.run('CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id)', (err) => {
        if (err) console.error('Error creating index on templates.user_id:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_mediator_proposals_negotiation_id ON mediator_proposals(negotiation_id)', (err) => {
        if (err) console.error('Error creating index on mediator_proposals.negotiation_id:', err);
        
        // Call callback after the last table/index is created
        if (callback) callback();
      });
    });
  });
}

/**
 * Create a new negotiation
 */
function createNegotiation(negotiationData, callback) {
  const db = getConnection();
  
  // Debug logging to help track foreign key issues
  console.log('Creating negotiation with user_id:', negotiationData.user_id);
  
  const {
    user_id, name, plaintiff_attorney, defendant_attorney, mediator, venue, judge,
    coverage, primary_coverage_limit, primary_insurer_name, primary_adjuster_name,
    umbrella_coverage_limit, umbrella_insurer_name, umbrella_adjuster_name,
    uim_coverage_limit, uim_insurer_name, uim_adjuster_name,
    defendant_type, injury_description, past_medical_bills,
    future_medical_bills, lcp, lost_wages, loss_earning_capacity, settlement_goal, notes
  } = negotiationData;

  const now = new Date().toISOString();

  db.run(
    `INSERT INTO negotiations (user_id, name, created_date, updated_date, plaintiff_attorney, defendant_attorney, 
     mediator, venue, judge, coverage, primary_coverage_limit, primary_insurer_name, primary_adjuster_name,
     umbrella_coverage_limit, umbrella_insurer_name, umbrella_adjuster_name,
     uim_coverage_limit, uim_insurer_name, uim_adjuster_name,
     defendant_type, injury_description, past_medical_bills, 
     future_medical_bills, lcp, lost_wages, loss_earning_capacity, status, settlement_goal, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, name, now, now, plaintiff_attorney, defendant_attorney, mediator, venue, judge,
     coverage, primary_coverage_limit || null, primary_insurer_name || null, primary_adjuster_name || null,
     umbrella_coverage_limit || null, umbrella_insurer_name || null, umbrella_adjuster_name || null,
     uim_coverage_limit || null, uim_insurer_name || null, uim_adjuster_name || null,
     defendant_type, injury_description, past_medical_bills, future_medical_bills,
     lcp, lost_wages, loss_earning_capacity, 'active', settlement_goal || null, notes || null],
    function(err) {
      if (err) {
        console.error('Database error creating negotiation:', err.message);
        if (err.message.includes('FOREIGN KEY constraint failed')) {
          console.error('Foreign key constraint failed - user_id', user_id, 'may not exist in users table');
        }
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, ...negotiationData, created_date: now, updated_date: now, status: 'active' });
      }
    }
  );
}

/**
 * Get all negotiations ordered by most recently updated (excludes soft-deleted)
 */
function getAllNegotiations(callback) {
  const db = getConnection();
  db.all('SELECT * FROM negotiations WHERE deleted_at IS NULL ORDER BY updated_date DESC', (err, rows) => {
    callback(err, rows || []);
  });
}

/**
 * Get all negotiations for a specific user (excludes soft-deleted)
 */
function getAllNegotiationsByUser(userId, callback) {
  const db = getConnection();
  db.all('SELECT * FROM negotiations WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_date DESC', [userId], (err, rows) => {
    callback(err, rows || []);
  });
}

/**
 * Get a single negotiation by ID
 */
function getNegotiationById(id, callback) {
  const db = getConnection();
  db.get('SELECT * FROM negotiations WHERE id = ? AND deleted_at IS NULL', [id], (err, row) => {
    callback(err, row);
  });
}

/**
 * Update a negotiation
 */
function updateNegotiation(id, updates, callback) {
  const db = getConnection();
  const now = new Date().toISOString();
  updates.updated_date = now;

  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  db.run(`UPDATE negotiations SET ${fields} WHERE id = ?`, [...values, id], function(err) {
    callback(err, { id, ...updates });
  });
}

/**
 * Soft delete a negotiation (sets deleted_at timestamp)
 * Note: Related records (moves, brackets, etc.) remain intact for data integrity
 */
function deleteNegotiation(id, callback) {
  const db = getConnection();
  const now = new Date().toISOString();
  db.run('UPDATE negotiations SET deleted_at = ?, updated_date = ? WHERE id = ?', [now, now, id], function(err) {
    callback(err);
  });
}

/**
 * Add a move (offer or demand)
 */
function addMove(moveData, callback) {
  const db = getConnection();
  const { negotiation_id, party, type, amount, notes } = moveData;
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO moves (negotiation_id, timestamp, party, type, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [negotiation_id, timestamp, party, type, amount, notes],
    function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, ...moveData, timestamp });
      }
    }
  );
}

/**
 * Get all moves for a negotiation
 */
function getMovesByNegotiationId(negotiation_id, callback) {
  const db = getConnection();
  db.all(
    'SELECT * FROM moves WHERE negotiation_id = ? ORDER BY timestamp ASC',
    [negotiation_id],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

/**
 * Get a single move by ID
 */
function getMoveById(moveId, callback) {
  const db = getConnection();
  db.get(
    'SELECT * FROM moves WHERE id = ?',
    [moveId],
    (err, row) => {
      callback(err, row);
    }
  );
}

/**
 * Delete a move
 */
function deleteMove(moveId, callback) {
  const db = getConnection();
  db.run('DELETE FROM moves WHERE id = ?', [moveId], function(err) {
    callback(err);
  });
}

/**
 * Get all parties for a negotiation
 */
function getPartiesByNegotiationId(negotiation_id, callback) {
  const db = getConnection();
  db.all(
    'SELECT * FROM parties WHERE negotiation_id = ? ORDER BY role, id ASC',
    [negotiation_id],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

/**
 * Get a single party by ID
 */
function getPartyById(partyId, callback) {
  const db = getConnection();
  db.get(
    'SELECT * FROM parties WHERE id = ?',
    [partyId],
    (err, row) => {
      callback(err, row);
    }
  );
}

/**
 * Create a new party
 */
function createParty(partyData, callback) {
  const db = getConnection();
  const { negotiation_id, role, party_name, attorney_name, law_firm_name } = partyData;
  const created_at = new Date().toISOString();

  db.run(
    'INSERT INTO parties (negotiation_id, role, party_name, attorney_name, law_firm_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [negotiation_id, role, party_name, attorney_name || null, law_firm_name || null, created_at],
    function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, ...partyData, created_at });
      }
    }
  );
}

/**
 * Update a party
 */
function updateParty(partyId, updates, callback) {
  const db = getConnection();
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  db.run(`UPDATE parties SET ${fields} WHERE id = ?`, [...values, partyId], function(err) {
    callback(err, { id: partyId, ...updates });
  });
}

/**
 * Delete a party
 */
function deleteParty(partyId, callback) {
  const db = getConnection();
  db.run('DELETE FROM parties WHERE id = ?', [partyId], function(err) {
    callback(err);
  });
}

/**
 * Save a calculation/analytics record
 */
function saveCalculation(calcData, callback) {
  const db = getConnection();
  const { negotiation_id, move_id, midpoint, midpoint_of_midpoints, momentum, predicted_settlement } = calcData;
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO calculations (negotiation_id, move_id, midpoint, midpoint_of_midpoints, momentum, predicted_settlement, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [negotiation_id, move_id, midpoint, midpoint_of_midpoints, momentum, predicted_settlement, createdAt],
    function(err) {
      callback(err);
    }
  );
}

/**
 * Create a bracket proposal (single-value model)
 * Proposes: "Plaintiff will be at plaintiff_amount if Defendant is at defendant_amount"
 * Can be proposed by either plaintiff or defendant
 */
function createBracket(bracketData, callback) {
  const db = getConnection();
  const { negotiation_id, plaintiff_amount, defendant_amount, notes, proposed_by } = bracketData;
  const created_at = new Date().toISOString();
  
  // Default to 'plaintiff' for backward compatibility
  const proposer = proposed_by || 'plaintiff';

  db.run(
    `INSERT INTO brackets (negotiation_id, created_at, plaintiff_amount, defendant_amount, notes, status, proposed_by)
     VALUES (?, ?, ?, ?, ?, 'active', ?)`,
    [negotiation_id, created_at, plaintiff_amount, defendant_amount, notes || null, proposer],
    function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, { id: this.lastID, ...bracketData, created_at, status: 'active', proposed_by: proposer });
      }
    }
  );
}

/**
 * Get all brackets for a negotiation
 */
function getBracketsByNegotiationId(negotiation_id, callback) {
  const db = getConnection();
  db.all(
    'SELECT * FROM brackets WHERE negotiation_id = ? ORDER BY created_at DESC',
    [negotiation_id],
    (err, rows) => {
      callback(err, rows || []);
    }
  );
}

/**
 * Update bracket status
 */
function updateBracket(bracketId, updates, callback) {
  const db = getConnection();
  const { status, notes } = updates;
  
  db.run(
    'UPDATE brackets SET status = ?, notes = ? WHERE id = ?',
    [status, notes, bracketId],
    function(err) {
      callback(err);
    }
  );
}

/**
 * Create or replace mediator proposal for a negotiation
 */
function createMediatorProposal(proposalData, callback) {
  const db = getConnection();
  const { negotiation_id, amount, deadline, notes } = proposalData;
  const created_at = new Date().toISOString();

  // Delete existing proposal for this negotiation (replace pattern)
  db.run('DELETE FROM mediator_proposals WHERE negotiation_id = ?', [negotiation_id], (err) => {
    if (err) {
      callback(err, null);
      return;
    }

    db.run(
      `INSERT INTO mediator_proposals (negotiation_id, created_at, amount, deadline, notes, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [negotiation_id, created_at, amount, deadline, notes || null],
      function(err) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, { 
            id: this.lastID, 
            negotiation_id, 
            created_at, 
            amount, 
            deadline, 
            notes, 
            status: 'pending',
            plaintiff_response: null,
            defendant_response: null
          });
        }
      }
    );
  });
}

/**
 * Get mediator proposal for a negotiation
 */
function getMediatorProposal(negotiation_id, callback) {
  const db = getConnection();
  db.get(
    'SELECT * FROM mediator_proposals WHERE negotiation_id = ?',
    [negotiation_id],
    (err, row) => {
      callback(err, row);
    }
  );
}

/**
 * Update mediator proposal (status and responses)
 */
function updateMediatorProposal(negotiation_id, updates, callback) {
  const db = getConnection();
  const { plaintiff_response, defendant_response, status } = updates;
  
  // Build dynamic query based on provided fields
  let query = 'UPDATE mediator_proposals SET ';
  let params = [];
  let sets = [];

  if (plaintiff_response !== undefined) {
    sets.push('plaintiff_response = ?');
    params.push(plaintiff_response);
  }
  if (defendant_response !== undefined) {
    sets.push('defendant_response = ?');
    params.push(defendant_response);
  }
  if (status !== undefined) {
    sets.push('status = ?');
    params.push(status);
  }

  query += sets.join(', ') + ' WHERE negotiation_id = ?';
  params.push(negotiation_id);

  db.run(query, params, function(err) {
    callback(err);
  });
}

/**
 * Check and mark expired mediator proposals
 */
function checkExpiredProposals(callback) {
  const db = getConnection();
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE mediator_proposals 
     SET status = 'expired' 
     WHERE deadline < ? AND status = 'pending'`,
    [now],
    function(err) {
      callback(err, this.changes);
    }
  );
}

/**
 * Create a new template from negotiation data
 */
function createTemplate(templateData, callback) {
  const db = getConnection();
  const { user_id, name, description, template_data } = templateData;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO templates (user_id, name, description, template_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, name, description || null, JSON.stringify(template_data), now, now],
    function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, {
          id: this.lastID,
          user_id,
          name,
          description,
          template_data,
          created_at: now,
          updated_at: now
        });
      }
    }
  );
}

/**
 * Get all templates for a user
 */
function getTemplatesByUser(userId, callback) {
  const db = getConnection();
  
  db.all(
    `SELECT id, user_id, name, description, template_data, created_at, updated_at
     FROM templates
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        // Parse template_data JSON for each row
        const templates = rows.map(row => ({
          ...row,
          template_data: JSON.parse(row.template_data)
        }));
        callback(null, templates);
      }
    }
  );
}

/**
 * Get template by ID
 */
function getTemplateById(templateId, userId, callback) {
  const db = getConnection();
  
  db.get(
    `SELECT id, user_id, name, description, template_data, created_at, updated_at
     FROM templates
     WHERE id = ? AND user_id = ?`,
    [templateId, userId],
    (err, row) => {
      if (err) {
        callback(err, null);
      } else if (!row) {
        callback(null, null);
      } else {
        callback(null, {
          ...row,
          template_data: JSON.parse(row.template_data)
        });
      }
    }
  );
}

/**
 * Update template
 */
function updateTemplate(templateId, userId, updates, callback) {
  const db = getConnection();
  const { name, description, template_data } = updates;
  const now = new Date().toISOString();

  let query = 'UPDATE templates SET updated_at = ?';
  let params = [now];

  if (name !== undefined) {
    query += ', name = ?';
    params.push(name);
  }
  if (description !== undefined) {
    query += ', description = ?';
    params.push(description);
  }
  if (template_data !== undefined) {
    query += ', template_data = ?';
    params.push(JSON.stringify(template_data));
  }

  query += ' WHERE id = ? AND user_id = ?';
  params.push(templateId, userId);

  db.run(query, params, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, { changes: this.changes });
    }
  });
}

/**
 * Delete template
 */
function deleteTemplate(templateId, userId, callback) {
  const db = getConnection();
  
  db.run(
    'DELETE FROM templates WHERE id = ? AND user_id = ?',
    [templateId, userId],
    function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    }
  );
}

module.exports = {
  initializeDatabase,
  getConnection,
  createUser,
  getUserByUsername,
  createNegotiation,
  getAllNegotiations,
  getAllNegotiationsByUser,
  getNegotiationById,
  updateNegotiation,
  addMove,
  getMovesByNegotiationId,
  getMoveById,
  deleteMove,
  getPartiesByNegotiationId,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  saveCalculation,
  deleteNegotiation,
  createBracket,
  getBracketsByNegotiationId,
  updateBracket,
  createMediatorProposal,
  getMediatorProposal,
  updateMediatorProposal,
  checkExpiredProposals,
  createTemplate,
  getTemplatesByUser,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  closeConnection: () => {
    if (dbConnection) {
      dbConnection.close();
      dbConnection = null;
    }
  },
  DB_PATH
};
