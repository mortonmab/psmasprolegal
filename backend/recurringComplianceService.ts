import { pool, generateUUID } from './database';
import { ComplianceService } from './complianceService';
import { EmailService } from './emailService';

export class RecurringComplianceService {
  /**
   * Process recurring compliance surveys that are due to run
   */
  static async processRecurringSurveys(): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      // Get all active recurring surveys that are due to run
      const [rows] = await connection.execute(
        `SELECT * FROM compliance_runs 
         WHERE is_recurring = TRUE 
         AND status = 'active' 
         AND next_run_date <= CURDATE()`
      );

      const dueSurveys = rows as any[];
      
      for (const survey of dueSurveys) {
        await this.runRecurringSurvey(survey);
      }
      
      console.log(`Processed ${dueSurveys.length} recurring surveys`);
    } catch (error) {
      console.error('Error processing recurring surveys:', error);
    } finally {
      connection.release();
    }
  }

  /**
   * Run a specific recurring survey
   */
  static async runRecurringSurvey(survey: any): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Create a new compliance run instance for this recurring survey
      const newRunId = generateUUID();
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Copy the survey with updated dates
      await connection.execute(
        `INSERT INTO compliance_runs (
          id, title, description, frequency, start_date, due_date, 
          recurring_day, is_recurring, status, created_by, 
          last_run_date, next_run_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [
          newRunId,
          `${survey.title} - ${new Date().toLocaleDateString()}`,
          survey.description,
          survey.frequency,
          currentDate,
          this.calculateDueDate(survey.frequency, survey.recurring_day),
          survey.recurring_day,
          false, // This instance is not recurring
          survey.created_by,
          currentDate,
          this.calculateNextRunDate(survey.frequency, survey.recurring_day)
        ]
      );

      // Copy questions
      const [questionRows] = await connection.execute(
        `SELECT * FROM compliance_questions WHERE compliance_run_id = ? ORDER BY order_index`,
        [survey.id]
      );
      
      const questions = questionRows as any[];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        await connection.execute(
          `INSERT INTO compliance_questions (
            id, compliance_run_id, question_text, question_type, 
            is_required, options, max_score, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            newRunId,
            question.question_text,
            question.question_type,
            question.is_required,
            question.options,
            question.max_score,
            i + 1
          ]
        );
      }

      // Copy recipients
      const [recipientRows] = await connection.execute(
        `SELECT * FROM compliance_recipients WHERE compliance_run_id = ?`,
        [survey.id]
      );
      
      const recipients = recipientRows as any[];
      for (const recipient of recipients) {
        await connection.execute(
          `INSERT INTO compliance_recipients (
            id, compliance_run_id, user_id, department_id, 
            email_sent, survey_completed, survey_link_token
          ) VALUES (?, ?, ?, ?, FALSE, FALSE, ?)`,
          [
            generateUUID(),
            newRunId,
            recipient.user_id,
            recipient.department_id,
            generateUUID() // Generate new token for this instance
          ]
        );
      }

      // Update the original survey's next run date
      await connection.execute(
        `UPDATE compliance_runs 
         SET last_run_date = ?, next_run_date = ? 
         WHERE id = ?`,
        [currentDate, this.calculateNextRunDate(survey.frequency, survey.recurring_day), survey.id]
      );

      await connection.commit();

      // Send notifications for the new survey instance
      await this.sendRecurringSurveyNotifications(newRunId);
      
      console.log(`Created recurring survey instance: ${newRunId}`);
    } catch (error) {
      await connection.rollback();
      console.error('Error running recurring survey:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Send notifications for a recurring survey instance
   */
  static async sendRecurringSurveyNotifications(runId: string): Promise<void> {
    try {
      // Get survey details
      const [runRows] = await pool.execute(
        `SELECT cr.*, u.full_name as created_by_name 
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [runId]
      );

      const runs = runRows as any[];
      if (!runs[0]) return;

      const survey = runs[0];

      // Get recipients
      const [recipientRows] = await pool.execute(
        `SELECT cr.*, u.email, u.full_name, d.name as department_name
         FROM compliance_recipients cr
         JOIN users u ON cr.user_id = u.id
         JOIN departments d ON cr.department_id = d.id
         WHERE cr.compliance_run_id = ?`,
        [runId]
      );

      const recipients = recipientRows as any[];

      // Send email notifications
      for (const recipient of recipients) {
        const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/compliance-survey/${recipient.survey_link_token}`;
        
        await EmailService.sendComplianceSurveyNotification({
          complianceRunId: runId,
          complianceRunTitle: survey.title,
          complianceRunDescription: survey.description,
          dueDate: new Date(survey.due_date).toLocaleDateString(),
          recipientEmail: recipient.email,
          recipientName: recipient.full_name,
          surveyLink: surveyUrl,
          departmentName: recipient.department_name,
          createdByName: survey.created_by_name
        });

        // Mark email as sent
        await pool.execute(
          `UPDATE compliance_recipients 
           SET email_sent = TRUE, email_sent_at = NOW() 
           WHERE id = ?`,
          [recipient.id]
        );
      }
    } catch (error) {
      console.error('Error sending recurring survey notifications:', error);
    }
  }

  /**
   * Calculate due date for recurring survey instance
   */
  private static calculateDueDate(frequency: string, recurringDay: number): string {
    const now = new Date();
    let dueDate = new Date(now);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(recurringDay);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + 3);
        dueDate.setDate(recurringDay);
        break;
      case 'annually':
        dueDate.setFullYear(dueDate.getFullYear() + 1);
        dueDate.setDate(recurringDay);
        break;
      case 'bimonthly':
        dueDate.setMonth(dueDate.getMonth() + 2);
        dueDate.setDate(recurringDay);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 14); // Default 2 weeks
    }
    
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Calculate next run date for recurring survey
   */
  private static calculateNextRunDate(frequency: string, recurringDay: number): string {
    const now = new Date();
    let nextDate = new Date(now);
    
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(recurringDay);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        nextDate.setDate(recurringDay);
        break;
      case 'annually':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        nextDate.setDate(recurringDay);
        break;
      case 'bimonthly':
        nextDate.setMonth(nextDate.getMonth() + 2);
        nextDate.setDate(recurringDay);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 30);
    }
    
    return nextDate.toISOString().split('T')[0];
  }
}
