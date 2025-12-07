/**
 * Seed script: Populate database with sample negotiation data
 * Usage: node scripts/seed.js
 */

const db = require('../database');
const bcryptjs = require('bcryptjs');

// Initialize database
db.initializeDatabase();

console.log('Seeding database with sample data...\n');

// Create demo user first
const demoUser = {
  username: 'demo',
  password: 'demo123'
};

// Hash the password
bcryptjs.hash(demoUser.password, 10, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err.message);
    process.exit(1);
  }

  // Create user in database using the new createUser function
  db.createUser(
    { username: demoUser.username, password_hash: hashedPassword },
    (err, user) => {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          console.log('ℹ Demo user already exists, using existing user...\n');
          seedNegotiations();
        } else {
          console.error('Error creating user:', err.message);
          process.exit(1);
        }
      } else {
        console.log(`✓ Created demo user: ${demoUser.username} (ID: ${user.id})`);
        console.log(`  Password: ${demoUser.password}\n`);
        seedNegotiations(user.id);
      }
    }
  );
});

function seedNegotiations(userId) {
  // Sample negotiations with user_id
    const sampleNegotiations = [
      {
        user_id: userId,
        name: 'Smith v. Acme Corp - Slip and Fall',
        plaintiff_attorney: 'Sarah Johnson, Esq.',
        defendant_attorney: 'Robert Williams, Esq.',
        mediator: 'Judge Michael Chen',
        venue: 'Superior Court, County of Los Angeles',
        judge: 'Hon. Patricia Martinez',
        coverage: '$1,000,000 General Liability',
        defendant_type: 'Corporation',
        injury_description: 'Plaintiff suffered broken left leg and ankle fracture after slipping on wet floor at defendant\'s retail store. Required surgery and 6 weeks hospitalization.',
        past_medical_bills: 45000,
        future_medical_bills: 25000,
        lcp: 15000,
        lost_wages: 18000,
        loss_earning_capacity: 35000,
        settlement_goal: 155000,
        notes: 'Case has strong liability evidence. Insurance coverage is ample. Parties mutually interested in settlement.'
      },
      {
        user_id: userId,
        name: 'Jones v. Metro Transit - Bus Accident',
        plaintiff_attorney: 'Lisa Park, Esq.',
        defendant_attorney: 'David Thompson, Esq.',
        mediator: 'Hon. Elizabeth Roberts',
        venue: 'Superior Court, County of San Francisco',
        judge: 'Hon. James Wilson',
        coverage: '$5,000,000 Transit Liability',
        defendant_type: 'Municipal Agency',
        injury_description: 'Plaintiff sustained whiplash injury, chronic neck pain, and headaches from rear-end bus collision. MRI confirms two bulging discs.',
        past_medical_bills: 32000,
        future_medical_bills: 18000,
        lcp: 25000,
        lost_wages: 12000,
        loss_earning_capacity: 40000,
        settlement_goal: 195000,
        notes: 'Significant soft tissue injury with ongoing treatment. Municipal liability exposure is substantial. Case suitable for early settlement.'
      }
    ];

    // Sample moves for negotiations
    const sampleMoves1 = [
      { party: 'plaintiff', type: 'demand', amount: 250000, notes: 'Initial demand based on medical records' },
      { party: 'defendant', type: 'offer', amount: 75000, notes: 'Initial offer' },
      { party: 'plaintiff', type: 'demand', amount: 200000, notes: 'Plaintiff reduction, considering future medical care' },
      { party: 'defendant', type: 'offer', amount: 120000, notes: 'Defendant increase based on medical review' },
      { party: 'plaintiff', type: 'demand', amount: 160000, notes: 'Further reduction by plaintiff' },
      { party: 'defendant', type: 'offer', amount: 145000, notes: 'Nearly converged' }
    ];

    const sampleMoves2 = [
      { party: 'plaintiff', type: 'demand', amount: 350000, notes: 'Initial demand' },
      { party: 'defendant', type: 'offer', amount: 100000, notes: 'Lowball offer' },
      { party: 'plaintiff', type: 'demand', amount: 280000, notes: 'Plaintiff reduction' },
      { party: 'defendant', type: 'offer', amount: 180000, notes: 'Significant defendant movement' }
    ];

    let createdCount = 0;
    let createdMoves = 0;

    // Create negotiations
    sampleNegotiations.forEach((negData, idx) => {
      db.createNegotiation(negData, (err, result) => {
        if (err) {
          console.error(`Error creating negotiation "${negData.name}":`, err.message);
        } else {
          createdCount++;
          console.log(`✓ Created case: "${result.name}" (ID: ${result.id})`);

          // Add moves for this negotiation
          const moves = idx === 0 ? sampleMoves1 : sampleMoves2;
          const movesForThisNeg = moves.map(m => ({ negotiation_id: result.id, ...m }));

          movesForThisNeg.forEach(moveData => {
            db.addMove(moveData, (err, moveResult) => {
              if (err) {
                console.error(`  Error adding move:`, err.message);
              } else {
                createdMoves++;
                console.log(`  ✓ Added ${moveData.type}: $${moveData.amount.toLocaleString()}`);
              }
            });
          });
        }
      });
    });

    // Summary after a brief delay
    setTimeout(() => {
      console.log(`\n✅ Seed complete: ${createdCount} cases, ${createdMoves} moves created`);
      console.log('Database file: server/negotiations.db\n');
      console.log('To log in, use:');
      console.log(`  Username: ${demoUser.username}`);
      console.log(`  Password: ${demoUser.password}`);
      process.exit(0);
    }, 1000);
}
