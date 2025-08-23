"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReminderJob = void 0;
const complianceReminderService_1 = require("./complianceReminderService");
/**
 * Scheduled job to send compliance reminder emails
 * This should be run daily (e.g., via cron job or scheduler)
 */
class ComplianceReminderJob {
    /**
     * Run the reminder job
     */
    static async run() {
        console.log('🔄 Starting compliance reminder job...');
        try {
            // Send reminder emails for today's scheduled reminders
            await complianceReminderService_1.ComplianceReminderService.sendReminderEmails();
            console.log('✅ Compliance reminder job completed successfully');
        }
        catch (error) {
            console.error('❌ Error running compliance reminder job:', error);
            throw error;
        }
    }
    /**
     * Schedule reminders for a specific compliance record
     */
    static async scheduleRemindersForRecord(complianceRecordId) {
        console.log(`🔄 Scheduling reminders for compliance record: ${complianceRecordId}`);
        try {
            await complianceReminderService_1.ComplianceReminderService.scheduleReminders(complianceRecordId);
            console.log(`✅ Reminders scheduled for compliance record: ${complianceRecordId}`);
        }
        catch (error) {
            console.error(`❌ Error scheduling reminders for compliance record ${complianceRecordId}:`, error);
            throw error;
        }
    }
    /**
     * Get pending reminders for today (for debugging/testing)
     */
    static async getPendingReminders() {
        try {
            const reminders = await complianceReminderService_1.ComplianceReminderService.getPendingReminders();
            console.log(`📧 Found ${reminders.length} pending reminders for today`);
            return reminders;
        }
        catch (error) {
            console.error('❌ Error getting pending reminders:', error);
            throw error;
        }
    }
}
exports.ComplianceReminderJob = ComplianceReminderJob;
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
