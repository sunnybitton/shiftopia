import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import { sheetsService } from '../services/sheetsService.js';
import { employeeOperations as dbService } from '../services/dbService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function migrateEmployees() {
  try {
    // Initialize the employees table
    await dbService.initializeTable();
    
    // Get all employees from Google Sheets
    const employees = await sheetsService.getAllEmployees();
    console.log(`Found ${employees.length} employees in Google Sheets`);

    if (!employees || employees.length === 0) {
      console.error('No valid employees found in Google Sheets');
      process.exit(1);
    }

    // Migrate each employee
    let successCount = 0;
    let errorCount = 0;

    for (const employee of employees) {
      try {
        // Validate required fields
        if (!employee.email || !employee.name) {
          console.log(`Skipping invalid employee:`, employee);
          errorCount++;
          continue;
        }

        // Check if employee already exists
        const existingEmployee = await dbService.getEmployeeByEmail(employee.email);
        
        if (!existingEmployee) {
          const result = await dbService.createEmployee({
            name: employee.name,
            email: employee.email,
            role: employee.role || 'Staff',
            worker_id: employee.worker_id,
            phone: employee.phone,
            username: employee.username
          });
          successCount++;
          console.log(`✓ Migrated employee: ${result.name} (${result.email})`);
        } else {
          console.log(`→ Employee already exists: ${employee.name} (${employee.email})`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating employee ${employee.name || 'unknown'}:`, error.message);
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total employees processed: ${employees.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateEmployees()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 