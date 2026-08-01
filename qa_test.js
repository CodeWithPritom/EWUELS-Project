require('dotenv').config();
const assert = require('assert').strict;
const bcrypt = require('bcrypt');
const pool = require('./config/db');
const User = require('./models/User');
const EquipmentType = require('./models/EquipmentType');
const EquipmentCopy = require('./models/EquipmentCopy');
const Request = require('./models/Request');
const Fine = require('./models/Fine');
const { calculateLateFine } = require('./utils/fineCalculator');
const { blockUserAndCancelRequests } = require('./utils/blockHelper');

async function runTests() {
    console.log('🧪 Starting Lead QA Integration Tests...\n');

    try {
        // Clean up any old QA test data to ensure a clean test run
        console.log('🧹 Cleaning up old QA test data...');
        await pool.query("DELETE FROM fines WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'qa_%')");
        await pool.query("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE 'qa_%')");
        await pool.query("DELETE FROM requests WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'qa_%')");
        await pool.query("DELETE FROM equipment_copies WHERE unique_code LIKE 'QA-%'");
        await pool.query("DELETE FROM equipment_types WHERE name LIKE 'QA %'");
        await pool.query("DELETE FROM users WHERE email LIKE 'qa_%'");
        console.log('  ✓ Cleanup finished.\n');

        // ==========================================
        // TEST 1: Student Signup and Login
        // ==========================================
        console.log('▶️ TEST 1: Student Signup and Login Simulation');
        
        const testStudentData = {
            name: 'QA Test Student',
            email: 'qa_student@uels.edu',
            password: 'password123',
            role: 'Student'
        };

        // 1. Simulate Signup Validation & Hashing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testStudentData.password, salt);
        
        const studentId = await User.create({
            name: testStudentData.name,
            email: testStudentData.email,
            password_hash: hashedPassword,
            role: testStudentData.role
        });
        
        assert.ok(studentId > 0, 'Student should be successfully created with a positive ID');
        console.log(`  ✓ Student signed up with ID: ${studentId}`);

        // 2. Simulate Login (Fetch by Email and Verify Password)
        const userInDb = await User.findByEmail(testStudentData.email);
        assert.ok(userInDb, 'User must exist in DB');
        assert.equal(userInDb.name, testStudentData.name, 'Name in DB should match');
        
        const passwordMatch = await bcrypt.compare(testStudentData.password, userInDb.password_hash);
        assert.ok(passwordMatch, 'Password verification must pass');
        console.log('  ✓ Student login simulation passed (correct credentials verified)');

        // Create a test staff account for approval tasks
        const staffId = await User.create({
            name: 'QA Test Staff',
            email: 'qa_staff@uels.edu',
            password_hash: await bcrypt.hash('password123', 10),
            role: 'Staff'
        });
        console.log(`  ✓ Staff user created with ID: ${staffId}\n`);


        // ==========================================
        // TEST 2: Requesting an item (Check copy status becomes 'Pending')
        // ==========================================
        console.log('▶️ TEST 2: Equipment Request & Immediate Copy Locking');

        // Create test equipment type & copy
        const typeId = await EquipmentType.create({
            name: 'QA Test Laptop',
            category: 'Laptop',
            description: 'Used for QA test run',
            image_url: ''
        });

        const copyId = await EquipmentCopy.create({
            equipment_type_id: typeId,
            unique_code: 'QA-LAP-01'
        });

        console.log(`  ✓ Test Equipment Type ID: ${typeId}, Copy Code: QA-LAP-01 (ID: ${copyId})`);

        // Verify copy status is Available
        let copy = await EquipmentCopy.findById(copyId);
        assert.equal(copy.status, 'Available', 'Initial copy status must be Available');

        // Simulate Request submission: pick copy, set Pending, create Request
        await EquipmentCopy.updateStatus(copyId, 'Pending');
        const requestId = await Request.create({
            user_id: studentId,
            copy_id: copyId,
            purpose: 'QA testing purposes',
            duration_type: 'Minute',
            duration_value: 30
        });

        assert.ok(requestId > 0, 'Request should be created with a positive ID');

        // Verify copy is now locked (Pending)
        copy = await EquipmentCopy.findById(copyId);
        assert.equal(copy.status, 'Pending', 'Copy status must be set to Pending immediately upon request');
        console.log(`  ✓ Request ID ${requestId} submitted. Copy locked to "Pending" successfully.\n`);


        // ==========================================
        // TEST 3: Staff Approval (Check if status becomes 'Reserved')
        // ==========================================
        console.log('▶️ TEST 3: Staff Approval & Copy Reservation');

        // Simulate pre-approval checks
        const student = await User.findById(studentId);
        assert.equal(student.account_status, 'Active', 'Student must not be blocked');
        
        const unpaidFinesCount = await Fine.countUnpaidByUser(studentId);
        assert.equal(unpaidFinesCount, 0, 'Student must not have unpaid fines');

        // Approve
        await Request.approve(requestId);
        await EquipmentCopy.updateStatus(copyId, 'Reserved');

        // Verify statuses
        const requestAfterApprove = await Request.findById(requestId);
        assert.equal(requestAfterApprove.status, 'Approved', 'Request status must be Approved');
        
        copy = await EquipmentCopy.findById(copyId);
        assert.equal(copy.status, 'Reserved', 'Copy status must be Reserved');
        console.log('  ✓ Staff checks passed. Reservation status set to "Reserved" successfully.\n');


        // ==========================================
        // TEST 4: Issuing (Check if due_at is calculated)
        // ==========================================
        console.log('▶️ TEST 4: Equipment Issuing & due_at Timestamp Calculation');

        // Issue 30-minute duration copy
        const durationValue = 30;
        const now = new Date();
        const dueAt = new Date(now.getTime() + durationValue * 60 * 1000);

        await Request.issue(requestId, dueAt);
        await EquipmentCopy.updateStatus(copyId, 'Issued');

        // Verify
        const requestAfterIssue = await Request.findById(requestId);
        assert.equal(requestAfterIssue.status, 'Issued', 'Request status must be Issued');
        assert.ok(requestAfterIssue.issued_at, 'issued_at must be populated');
        assert.ok(requestAfterIssue.due_at, 'due_at must be populated');
        
        const calculatedDueTime = new Date(requestAfterIssue.due_at).getTime();
        const differenceMs = Math.abs(calculatedDueTime - dueAt.getTime());
        assert.ok(differenceMs < 5000, 'Calculated due_at must match the expected expiry offset');

        copy = await EquipmentCopy.findById(copyId);
        assert.equal(copy.status, 'Issued', 'Copy status must be set to Issued');
        console.log('  ✓ Equipment issued. due_at timestamp calculated correctly.\n');


        // ==========================================
        // TEST 5: Late Return & Auto-Block
        // ==========================================
        console.log('▶️ TEST 5: Late Return, Fine Incurrence, & Auto-Blocking');

        // Manually manipulate database due_at to the past (e.g. 15 minutes overdue)
        const overdueMinutes = 15;
        const fakeDueTime = new Date(Date.now() - overdueMinutes * 60 * 1000);
        await pool.query('UPDATE requests SET due_at = ? WHERE id = ?', [fakeDueTime, requestId]);

        // Re-fetch request with manipulated time
        const manipulatedRequest = await Request.findById(requestId);

        // Process Return logic simulation
        await Request.returnEquipment(requestId, 'Good');
        await EquipmentCopy.updateStatus(copyId, 'Available');

        // Fine calculation checks
        const rateMinute = 1; // Default XAMPP config rate per minute
        const calculatedFine = calculateLateFine(manipulatedRequest, 50, rateMinute, new Date());
        assert.ok(calculatedFine >= overdueMinutes, 'Fine amount should correspond to overdue minutes');

        // Create the fine record
        const fineId = await Fine.create({
            request_id: requestId,
            user_id: studentId,
            fine_type: 'Late',
            amount: calculatedFine
        });

        // Trigger Auto-block helper
        await blockUserAndCancelRequests(studentId, 'Auto', 'Overdue equipment return', staffId);

        // Verify Student Block Status
        const blockedStudent = await User.findById(studentId);
        assert.equal(blockedStudent.account_status, 'Blocked', 'Student must be auto-blocked');
        assert.equal(blockedStudent.block_type, 'Auto', 'Block type must be Auto');

        // Verify Fine Record
        const fineInDb = await pool.query('SELECT * FROM fines WHERE id = ?', [fineId]);
        assert.equal(fineInDb[0][0].fine_status, 'Unpaid', 'Fine status must initially be Unpaid');
        
        console.log(`  ✓ Item returned overdue. Unpaid fine of ৳${calculatedFine} created.`);
        console.log('  ✓ Student auto-blocked with block type "Auto".\n');


        // ==========================================
        // TEST 6: Fine Payment & Auto-Unblock
        // ==========================================
        console.log('▶️ TEST 6: Fine Payment & Auto-Unblocking');

        // Mark fine as Paid
        await Fine.markPaid(fineId, staffId);

        // Run unblock logic check
        const remainingUnpaid = await Fine.countUnpaidByUser(studentId);
        assert.equal(remainingUnpaid, 0, 'No unpaid fines should remain');

        const currentBlockedStudent = await User.findById(studentId);
        if (remainingUnpaid === 0 && currentBlockedStudent.block_type === 'Auto') {
            await User.updateStatus(studentId, 'Active', null, null, null);
        }

        // Verify student is Active
        const unblockedStudent = await User.findById(studentId);
        assert.equal(unblockedStudent.account_status, 'Active', 'Student must be unblocked and Active');
        assert.equal(unblockedStudent.block_type, null, 'Block type must be cleared (null)');

        console.log('  ✓ Fine paid successfully. Student automatically unblocked.');
        console.log('  ✓ Block status cleared to null.\n');

        console.log('✅ ALL QA INTEGRATION TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ QA TEST FAIL:', err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

runTests();
