import { ComplianceReminderService } from './complianceReminderService';

/**
 * Scheduled job to send compliance reminder emails
 * This should be run daily (e.g., via cron job or scheduler)
 */
export class ComplianceReminderJob {
  /**
   * Run the reminder job
   */
  static async run(): Promise<void> {
    console.log('🔄 Starting compliance reminder job...');
    
    try {
      // Send reminder emails for today's scheduled reminders
      await ComplianceReminderService.sendReminderEmails();
      
      console.log('✅ Compliance reminder job completed successfully');
    } catch (error) {
      console.error('❌ Error running compliance reminder job:', error);
      throw error;
    }
  }

  /**
   * Schedule reminders for a specific compliance record
   */
  static async scheduleRemindersForRecord(complianceRecordId: string): Promise<void> {
    console.log(`🔄 Scheduling reminders for compliance record: ${complianceRecordId}`);
    
    try {
      await ComplianceReminderService.scheduleReminders(complianceRecordId);
      console.log(`✅ Reminders scheduled for compliance record: ${complianceRecordId}`);
    } catch (error) {
      console.error(`❌ Error scheduling reminders for compliance record ${complianceRecordId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending reminders for today (for debugging/testing)
   */
  static async getPendingReminders(): Promise<any[]> {
    try {
      const reminders = await ComplianceReminderService.getPendingReminders();
      console.log(`📧 Found ${reminders.length} pending reminders for today`);
      return reminders;
    } catch (error) {
      console.error('❌ Error getting pending reminders:', error);
      throw error;
    }
  }
}

// If this file is run directly, execute the reminder job
if (require.main === module) {
  ComplianceReminderJob.run()
    .then(() => {
      console.log('🎉 Reminder job completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reminder job failed:', error);
      process.exit(1);
    });
}
