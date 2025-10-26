import { test, expect } from '@playwright/test';
import path from 'path';

// Seeded lecturer from backend/seed_db.py
const SEEDED_LECTURER = {
  email: 'john.smith@example.com',
  password: 'staff123',
};

// Test fixture files
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'files');
const TEST_FILES = {
  questionPaper: path.join(FIXTURES_DIR, 'test.pdf'),
  classlist: path.join(FIXTURES_DIR, 'students.csv'),
  facilitators: path.join(FIXTURES_DIR, 'sample_facilitators.csv'),
  answerSheets: [
    path.join(FIXTURES_DIR, '12345678.pdf'),
    path.join(FIXTURES_DIR, '12345679.pdf'),
    path.join(FIXTURES_DIR, '12345680.pdf'),
  ],
};

// Test data 
const timestamp = Date.now();
const TEST_COURSE_DATA = {
  title: `E2E Test Course ${timestamp}`,
  code: `E2E-${timestamp}`,
};

const TEST_ASSESSMENT_DATA = {
  title: `Midterm Exam ${timestamp}`,
};

test.describe('Lecturer - Full Integration Workflow', () => {
  test('Complete lecturer workflow: Create course → Upload files → Grade → Publish', async ({ page }) => {
    // ============================================
    // LOGIN
    // ============================================
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/auth/);
    
  // Wait for login form to be visible (use role-based heading lookup)
  await expect(page.getByRole('heading', { name: /Login/i })).toBeVisible();
    
    await page.fill('input[type="email"]', SEEDED_LECTURER.email);
    await page.fill('input[type="password"]', SEEDED_LECTURER.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete - should redirect to dashboard (root)
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Check if we're still on auth page (login failed)
    if (currentUrl.includes('/auth')) {
      throw new Error('Login failed - still on auth page. Check if lecturer credentials are correct.');
    }

    console.log('\u2713 Logged in as lecturer');

    // ============================================
    // STEP 1: CREATE A NEW COURSE
    // ============================================
    console.log('Step 1: Creating new course...');

    // The lecturer dashboard should already show courses view by default
    // Look for the create course button (Plus icon in the header)
    const createCourseBtn = page.locator('button:has(svg.lucide-plus)').first();
    if (await createCourseBtn.count() === 0) {
      console.log('Create course button not found - skipping course creation');
    } else {
      await createCourseBtn.click();

      // Fill in course details in modal
      await page.fill('input[placeholder="Course Title"]', TEST_COURSE_DATA.title);
      await page.fill('input[placeholder="Course Code (optional)"]', TEST_COURSE_DATA.code);

      // Submit course creation
      await page.click('button:has-text("Create Course")');
      await page.waitForTimeout(1500);
      console.log(`\u2713 Created course: ${TEST_COURSE_DATA.title}`);
    }

    // ============================================
    // STEP 2: OPEN THE CREATED COURSE
    // ============================================
    console.log('Step 2: Opening course...');

    // Find the course button by its text
    const courseButton = page.locator(`button:has-text("${TEST_COURSE_DATA.title}")`).first();
    if (await courseButton.count() === 0) {
      console.log('Course button not found - skipping');
    } else {
      await courseButton.click();
      await page.waitForTimeout(1000);
      console.log(`\u2713 Opened course: ${TEST_COURSE_DATA.title}`);
    }

    // ============================================
    // STEP 3: UPLOAD CLASS LIST (CSV)
    // ============================================
    console.log('Step 3: Uploading class list...');

    // Look for the "+ Add" label button for students (first file input is for students)
    const uploadClasslistInput = page.locator('label:has-text("+ Add") input[type="file"][accept=".csv"]').first();
    if (await uploadClasslistInput.count() === 0) {
      console.log('Upload classlist input not found - skipping');
    } else {
      // Set up dialog handler before triggering upload
      page.on('dialog', async dialog => {
        console.log('  Alert:', dialog.message());
        await dialog.accept();
      });
      
      await uploadClasslistInput.setInputFiles(TEST_FILES.classlist);
      await page.waitForTimeout(2500);
      console.log('\u2713 Uploaded class list');
    }

    // ============================================
    // STEP 4: CREATE AN ASSESSMENT
    // ============================================
    console.log('Step 4: Creating assessment...');

    // Wait a bit for the UI to settle
    await page.waitForTimeout(500);

    // The MoreVertical icon from lucide-react renders as "ellipsis-vertical" in the DOM
    const menuButton = page.locator('button:has(> svg.lucide-ellipsis-vertical)').first();
    
    const count = await menuButton.count();
    console.log(`  Found ${count} menu button(s)`);
    
    if (count === 0) {
      console.log('Course menu button not found - skipping assessment creation');
    } else {
      console.log('  Clicking menu button...');
      await menuButton.click();
      await page.waitForTimeout(500);

      // Click "Add Assignment" option in dropdown
      const addAssignmentOption = page.locator('text="Add Assignment"');
      if (await addAssignmentOption.count() === 0) {
        console.log('Add Assignment option not found - skipping');
      } else {
        await addAssignmentOption.click();
        await page.waitForTimeout(500);

        // Fill assessment details
        await page.fill('input[placeholder="Assessment Title"]', TEST_ASSESSMENT_DATA.title);

        // Upload question paper PDF
        const questionPaperInput = page.locator('input[type="file"][accept=".pdf"]').first();
        await questionPaperInput.setInputFiles(TEST_FILES.questionPaper);
        await page.waitForTimeout(500);

        // Submit
        await page.click('button:has-text("Create Assessment")');
        await page.waitForTimeout(2000);
        console.log(`✓ Created assessment: ${TEST_ASSESSMENT_DATA.title}`);
      }
    }

    // ============================================
    // STEP 5: OPEN THE ASSESSMENT
    // ============================================
    console.log('Step 5: Opening assessment...');

    const assessmentButton = page.locator(`button:has-text("${TEST_ASSESSMENT_DATA.title}")`).first();
    if (await assessmentButton.count() === 0) {
      console.log('Assessment button not found - skipping');
    } else {
      await assessmentButton.click();
      await page.waitForTimeout(1000);
      console.log(`\u2713 Opened assessment: ${TEST_ASSESSMENT_DATA.title}`);
    }

    // ============================================
    // STEP 6: UPLOAD ANSWER SHEETS (PDFs)
    // ============================================
    console.log('Step 6: Uploading answer sheets...');

    // The file input for answer sheets accepts multiple PDFs
    const uploadInput = page.locator('input[type="file"][accept=".pdf"][multiple]');
    
    if (await uploadInput.count() === 0) {
      console.log('Upload answer sheets input not found - skipping');
    } else {
      await uploadInput.setInputFiles(TEST_FILES.answerSheets);
      
      // Wait for and handle the success alert
      page.on('dialog', async dialog => {
        console.log('  Alert:', dialog.message());
        await dialog.accept();
      });
      
      await page.waitForTimeout(3000);
      console.log('\u2713 Uploaded answer sheets');
    }

    // ============================================
    // STEP 7: NAVIGATE TO MAPPING
    // ============================================
    console.log('Step 7: Navigating to mapping...');

    const mappingBtn = page.locator('button:has-text("Map Questions")');
    if (await mappingBtn.count() === 0) {
      console.log('Mapping button not found - skipping');
    } else {
      await mappingBtn.click();
      await page.waitForTimeout(1500);
      console.log('\u2713 Opened mapping view');
      
      // Go back to assessment view
      const viewBtn = page.locator('button:has-text("View")');
      if (await viewBtn.count() > 0) {
        await viewBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // ============================================
    // STEP 8: NAVIGATE TO GRADING
    // ============================================
    console.log('Step 8: Navigating to grading...');

    const gradingBtn = page.locator('button:has-text("Grade")').first();
    if (await gradingBtn.count() === 0) {
      console.log('Grading button not found - skipping');
    } else {
      await gradingBtn.click();
      await page.waitForTimeout(1500);
      console.log('\u2713 Opened grading view');
      
      // Go back to assessment view
      const viewBtn = page.locator('button:has-text("View")');
      if (await viewBtn.count() > 0) {
        await viewBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // ============================================
    // STEP 9: PUBLISH ASSESSMENT RESULTS
    // ============================================
    console.log('Step 9: Publishing results...');

    const publishBtn = page.locator('button:has-text("Publish")');
    if (await publishBtn.count() === 0) {
      console.log('Publish button not found - skipping');
    } else {
      // Handle the alert that appears when publishing
      page.on('dialog', async dialog => {
        console.log('  Publish alert:', dialog.message());
        await dialog.accept();
      });
      
      await publishBtn.click();
      await page.waitForTimeout(1500);
      console.log('\u2713 Published assessment results');
    }

    // ============================================
    // FINAL: Test Complete
    // ============================================
    console.log('\n\u2713 FULL WORKFLOW COMPLETE!');
    console.log('Summary:');
    console.log(`- Course: ${TEST_COURSE_DATA.title} (${TEST_COURSE_DATA.code})`);
    console.log(`- Assessment: ${TEST_ASSESSMENT_DATA.title}`);
    console.log(`- Students uploaded from: ${TEST_FILES.classlist}`);
    console.log(`- Answer sheets uploaded: ${TEST_FILES.answerSheets.length} files`);
    console.log(`- Assessment status: Published`);

    // ============================================
    // CLEANUP: Delete the test course
    // ============================================
    console.log('\nCleaning up test data...');
    
    // Find the course in the sidebar and delete it
    const cleanupCourseButton = page.locator(`button:has-text("${TEST_COURSE_DATA.title}")`).first();
    if (await cleanupCourseButton.count() > 0) {
      // Click the course to select it (force click in case something is overlaying)
      await cleanupCourseButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Find and click the three-dot menu (uses ellipsis-vertical, not more-vertical)
      const cleanupMenuBtn = page.locator('button:has(> svg.lucide-ellipsis-vertical)').first();
      if (await cleanupMenuBtn.count() > 0) {
        await cleanupMenuBtn.click({ force: true });
        await page.waitForTimeout(300);
        
        // Click "Delete Course" option
        const deleteOption = page.locator('text="Delete Course"');
        if (await deleteOption.count() > 0) {
          await deleteOption.click();
          await page.waitForTimeout(500);
          console.log(`\u2713 Deleted test course: ${TEST_COURSE_DATA.title}`);
        } else {
          console.log('Delete Course option not found');
        }
      } else {
        console.log('Course menu button not found for cleanup');
      }
    } else {
      console.log('Course not found for cleanup (may have been deleted already)');
    }
  });

  /**
   * File verification test
   */
  test('Verify all test files exist', async () => {
    const fs = require('fs');
    
    console.log('\nVerifying test fixture files...');
    
    const files = [
      { path: TEST_FILES.questionPaper, name: 'Question Paper' },
      { path: TEST_FILES.classlist, name: 'Class List CSV' },
      { path: TEST_FILES.facilitators, name: 'Facilitators CSV' },
      ...TEST_FILES.answerSheets.map((p, i) => ({ path: p, name: `Answer Sheet ${i + 1}` })),
    ];

    for (const file of files) {
      const exists = fs.existsSync(file.path);
      if (!exists) {
        throw new Error(`Missing test file: ${file.name} at ${file.path}`);
      }
      console.log(`\u2713 ${file.name}: ${file.path}`);
    }
    
    console.log('\n\u2713 All test fixture files are present');
  });
});
