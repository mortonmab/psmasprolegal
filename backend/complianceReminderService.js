"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReminderService = void 0;
const database_1 = require("./database");
const emailService_1 = require("./emailService");
const crypto_1 = __importDefault(require("crypto"));
class ComplianceReminderService {
    /**
     * Add a recipient to a compliance record
     */
    static async addRecipient(data) {
        const connection = await database_1.pool.getConnection();
        try {
            const id = (0, database_1.generateUUID)();
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await connection.execute(`INSERT INTO compliance_reminder_recipients (
          id, compliance_record_id, user_id, external_user_id, email, name, role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.complianceRecordId, data.userId || null, data.externalUserId || null, data.email, data.name, data.role || null, now]);
            // Get the created recipient
            const [rows] = await connection.execute(`SELECT * FROM compliance_reminder_recipients WHERE id = ?`, [id]);
            const recipients = rows;
            return this.mapRecipientRecordToInterface(recipients[0]);
        }
        catch (error) {
            console.error('Error adding recipient:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Get recipients for a compliance record
     */
    static async getRecipients(complianceRecordId) {
        const connection = await database_1.pool.getConnection();
        try {
            const [rows] = await connection.execute(`SELECT * FROM compliance_reminder_recipients WHERE compliance_record_id = ? ORDER BY created_at`, [complianceRecordId]);
            return rows.map(record => this.mapRecipientRecordToInterface(record));
        }
        catch (error) {
            console.error('Error getting recipients:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Remove a recipient from a compliance record
     */
    static async removeRecipient(recipientId) {
        const connection = await database_1.pool.getConnection();
        try {
            const [result] = await connection.execute('DELETE FROM compliance_reminder_recipients WHERE id = ?', [recipientId]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('Error removing recipient:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Schedule reminders for a compliance record
     */
    static async scheduleReminders(complianceRecordId) {
        const connection = await database_1.pool.getConnection();
        try {
            // Get the compliance record
            const [recordRows] = await connection.execute(`SELECT * FROM general_compliance_records WHERE id = ?`, [complianceRecordId]);
            const records = recordRows;
            if (records.length === 0) {
                throw new Error('Compliance record not found');
            }
            const record = records[0];
            // Get recipients
            const recipients = await this.getRecipients(complianceRecordId);
            if (recipients.length === 0) {
                console.log('No recipients found for compliance record:', complianceRecordId);
                return;
            }
            // Calculate reminder dates
            const dueDate = new Date(record.due_date);
            const twoWeeksBefore = new Date(dueDate.getTime() - 14 * 24 * 60 * 60 * 1000);
            const oneWeekBefore = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            // Schedule reminders for each recipient
            for (const recipient of recipients) {
                // Two weeks before
                await this.scheduleReminder(complianceRecordId, recipient.id, 'two_weeks', twoWeeksBefore.toISOString().split('T')[0]);
                // One week before
                await this.scheduleReminder(complianceRecordId, recipient.id, 'one_week', oneWeekBefore.toISOString().split('T')[0]);
                // Due date
                await this.scheduleReminder(complianceRecordId, recipient.id, 'due_date', dueDate.toISOString().split('T')[0]);
            }
            console.log(`Scheduled reminders for compliance record: ${complianceRecordId}`);
        }
        catch (error) {
            console.error('Error scheduling reminders:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Schedule a single reminder
     */
    static async scheduleReminder(complianceRecordId, recipientId, reminderType, scheduledDate) {
        const connection = await database_1.pool.getConnection();
        try {
            const id = (0, database_1.generateUUID)();
            const confirmationToken = crypto_1.default.randomBytes(32).toString('hex');
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await connection.execute(`INSERT INTO compliance_reminders (
          id, compliance_record_id, recipient_id, reminder_type, scheduled_date, 
          confirmation_token, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, complianceRecordId, recipientId, reminderType, scheduledDate, confirmationToken, now, now]);
        }
        catch (error) {
            console.error('Error scheduling reminder:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Get pending reminders for today
     */
    static async getPendingReminders() {
        const connection = await database_1.pool.getConnection();
        try {
            const today = new Date().toISOString().split('T')[0];
            const [rows] = await connection.execute(`SELECT * FROM compliance_reminders 
         WHERE scheduled_date = ? AND status = 'pending'
         ORDER BY scheduled_date, created_at`, [today]);
            return rows.map(record => this.mapReminderRecordToInterface(record));
        }
        catch (error) {
            console.error('Error getting pending reminders:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Send reminder emails
     */
    static async sendReminderEmails() {
        const connection = await database_1.pool.getConnection();
        try {
            const pendingReminders = await this.getPendingReminders();
            for (const reminder of pendingReminders) {
                try {
                    await this.sendReminderEmail(reminder);
                    // Mark as sent
                    await connection.execute(`UPDATE compliance_reminders 
             SET email_sent = TRUE, sent_at = NOW(), status = 'sent' 
             WHERE id = ?`, [reminder.id]);
                    console.log(`Sent reminder email for compliance record: ${reminder.complianceRecordId}`);
                }
                catch (error) {
                    console.error(`Failed to send reminder email for reminder ${reminder.id}:`, error);
                    // Mark as failed
                    await connection.execute(`UPDATE compliance_reminders 
             SET status = 'failed' 
             WHERE id = ?`, [reminder.id]);
                }
            }
        }
        catch (error) {
            console.error('Error sending reminder emails:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Send a single reminder email
     */
    static async sendReminderEmail(reminder) {
        const connection = await database_1.pool.getConnection();
        try {
            // Get reminder details with compliance record and recipient info
            const [rows] = await connection.execute(`SELECT 
          cr.*, gcr.name as compliance_name, gcr.description, gcr.due_date, gcr.frequency,
          crr.email, crr.name as recipient_name
         FROM compliance_reminders cr
         JOIN general_compliance_records gcr ON cr.compliance_record_id = gcr.id
         JOIN compliance_reminder_recipients crr ON cr.recipient_id = crr.id
         WHERE cr.id = ?`, [reminder.id]);
            const reminders = rows;
            if (reminders.length === 0) {
                throw new Error('Reminder not found');
            }
            const reminderData = reminders[0];
            const confirmationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/compliance-confirm/${reminder.confirmationToken}`;
            // Send email
            const emailSent = await emailService_1.EmailService.sendComplianceReminder({
                recipientName: reminderData.recipient_name,
                recipientEmail: reminderData.email,
                complianceName: reminderData.compliance_name,
                complianceDescription: reminderData.description,
                dueDate: new Date(reminderData.due_date).toLocaleDateString(),
                reminderType: reminder.reminderType,
                frequency: reminderData.frequency,
                confirmationLink
            });
            if (!emailSent) {
                throw new Error('Failed to send email');
            }
        }
        catch (error) {
            console.error('Error sending reminder email:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Confirm compliance submission/renewal
     */
    static async confirmCompliance(token, confirmationData) {
        const connection = await database_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            // Get reminder by token
            const [reminderRows] = await connection.execute(`SELECT * FROM compliance_reminders WHERE confirmation_token = ? AND status = 'sent'`, [token]);
            const reminders = reminderRows;
            if (reminders.length === 0) {
                throw new Error('Invalid or expired confirmation token');
            }
            const reminder = reminders[0];
            // Create confirmation record
            const confirmationId = (0, database_1.generateUUID)();
            await connection.execute(`INSERT INTO compliance_confirmations (
          id, compliance_record_id, reminder_id, confirmed_by, confirmed_email, 
          confirmation_type, notes, confirmation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`, [
                confirmationId,
                reminder.compliance_record_id,
                reminder.id,
                confirmationData.confirmedBy,
                confirmationData.confirmedEmail,
                confirmationData.confirmationType,
                confirmationData.notes || null
            ]);
            // Update reminder status
            await connection.execute(`UPDATE compliance_reminders 
         SET confirmed_at = NOW(), confirmed_by = ?, status = 'confirmed' 
         WHERE id = ?`, [confirmationData.confirmedBy, reminder.id]);
            // Update compliance record status if completed
            if (confirmationData.confirmationType === 'completed') {
                await connection.execute(`UPDATE general_compliance_records 
           SET status = 'completed' 
           WHERE id = ?`, [reminder.compliance_record_id]);
            }
            await connection.commit();
            return true;
        }
        catch (error) {
            await connection.rollback();
            console.error('Error confirming compliance:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Get confirmation by token
     */
    static async getConfirmationByToken(token) {
        const connection = await database_1.pool.getConnection();
        try {
            const [rows] = await connection.execute(`SELECT 
          cr.*, gcr.name as compliance_name, gcr.description, gcr.due_date, gcr.frequency,
          crr.email, crr.name as recipient_name
         FROM compliance_reminders cr
         JOIN general_compliance_records gcr ON cr.compliance_record_id = gcr.id
         JOIN compliance_reminder_recipients crr ON cr.recipient_id = crr.id
         WHERE cr.confirmation_token = ?`, [token]);
            const reminders = rows;
            if (reminders.length === 0) {
                return null;
            }
            const reminderData = reminders[0];
            return {
                reminder: this.mapReminderRecordToInterface(reminderData),
                complianceRecord: {
                    id: reminderData.compliance_record_id,
                    name: reminderData.compliance_name,
                    description: reminderData.description,
                    dueDate: reminderData.due_date,
                    frequency: reminderData.frequency
                },
                recipient: {
                    id: reminderData.recipient_id,
                    complianceRecordId: reminderData.compliance_record_id,
                    email: reminderData.email,
                    name: reminderData.recipient_name,
                    createdAt: reminderData.created_at
                }
            };
        }
        catch (error) {
            console.error('Error getting confirmation by token:', error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
    /**
     * Helper method to map recipient record to interface
     */
    static mapRecipientRecordToInterface(record) {
        return {
            id: record.id,
            complianceRecordId: record.compliance_record_id,
            userId: record.user_id,
            externalUserId: record.external_user_id,
            email: record.email,
            name: record.name,
            role: record.role,
            createdAt: record.created_at
        };
    }
    /**
     * Helper method to map reminder record to interface
     */
    static mapReminderRecordToInterface(record) {
        return {
            id: record.id,
            complianceRecordId: record.compliance_record_id,
            recipientId: record.recipient_id,
            reminderType: record.reminder_type,
            scheduledDate: record.scheduled_date,
            sentAt: record.sent_at,
            emailSent: record.email_sent === 1,
            confirmationToken: record.confirmation_token,
            confirmedAt: record.confirmed_at,
            confirmedBy: record.confirmed_by,
            status: record.status,
            createdAt: record.created_at,
            updatedAt: record.updated_at
        };
    }
}
exports.ComplianceReminderService = ComplianceReminderService;
