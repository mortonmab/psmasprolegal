import { pool, generateUUID } from './database';
import { EmailService, ComplianceSurveyData } from './emailService';
import crypto from 'crypto';

export interface ComplianceRun {
  id: string;
  title: string;
  description: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually';
  startDate: string;
  dueDate: string;
  status: 'draft' | 'active' | 'completed' | 'expired';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceQuestion {
  id: string;
  complianceRunId: string;
  questionText: string;
  questionType: 'yesno' | 'score' | 'multiple' | 'text';
  isRequired: boolean;
  options?: string[];
  maxScore?: number;
  orderIndex: number;
  createdAt: string;
}

export interface ComplianceRecipient {
  id: string;
  complianceRunId: string;
  userId: string;
  departmentId: string;
  emailSent: boolean;
  emailSentAt?: string;
  surveyCompleted: boolean;
  surveyCompletedAt?: string;
  surveyLinkToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceResponse {
  id: string;
  complianceRunId: string;
  userId: string;
  questionId: string;
  answer?: string;
  score?: number;
  comment?: string;
  createdAt: string;
}

export class ComplianceService {
  /**
   * Create a new compliance run
   */
  static async createComplianceRun(data: {
    title: string;
    description: string;
    frequency: string;
    startDate: string;
    dueDate: string;
    recurringDay?: string;
    departmentIds: string[];
    questions: Array<{
      questionText: string;
      questionType: string;
      isRequired: boolean;
      options?: string[];
      maxScore?: number;
    }>;
    createdBy: string;
  }): Promise<ComplianceRun> {
    // Validate required fields
    if (!data.title || !data.description || !data.frequency || !data.startDate || !data.dueDate || !data.createdBy) {
      throw new Error('Missing required fields: title, description, frequency, startDate, dueDate, or createdBy');
    }

    if (!Array.isArray(data.departmentIds)) {
      throw new Error('departmentIds must be an array');
    }

    if (!Array.isArray(data.questions)) {
      throw new Error('questions must be an array');
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Calculate recurring fields
      const isRecurring = data.frequency !== 'once';
      const recurringDay = data.recurringDay ? parseInt(data.recurringDay) : null;
      
      // Calculate next run date for recurring surveys
      let nextRunDate = null;
      if (isRecurring && recurringDay) {
        const startDate = new Date(data.startDate);
        nextRunDate = calculateNextRunDate(data.frequency, recurringDay, startDate);
      }

      // Create compliance run
      const runId = generateUUID();
      await connection.execute(
        `INSERT INTO compliance_runs (id, title, description, frequency, start_date, due_date, recurring_day, is_recurring, next_run_date, status, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [runId, data.title, data.description, data.frequency, data.startDate, data.dueDate, recurringDay, isRecurring, nextRunDate, data.createdBy]
      );

      // Add departments
      for (const deptId of data.departmentIds) {
        await connection.execute(
          `INSERT INTO compliance_run_departments (id, compliance_run_id, department_id) 
           VALUES (?, ?, ?)`,
          [generateUUID(), runId, deptId]
        );
      }

      // Add questions
      for (let i = 0; i < data.questions.length; i++) {
        const question = data.questions[i];
        await connection.execute(
          `INSERT INTO compliance_questions (id, compliance_run_id, question_text, question_type, is_required, options, max_score, order_index) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            runId,
            question.questionText,
            question.questionType,
            question.isRequired,
            question.options ? JSON.stringify(question.options) : null,
            question.maxScore || null,
            i + 1
          ]
        );
      }

      await connection.commit();

      // Get the created run
      const [rows] = await connection.execute(
        `SELECT * FROM compliance_runs WHERE id = ?`,
        [runId]
      );

      const runs = rows as ComplianceRun[];
      return runs[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Activate a compliance run and send notifications
   */
  static async activateComplianceRun(runId: string): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update run status to active
      await connection.execute(
        `UPDATE compliance_runs SET status = 'active' WHERE id = ?`,
        [runId]
      );

      // Get run details
      const [runRows] = await connection.execute(
        `SELECT cr.*, u.full_name as created_by_name 
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [runId]
      );

      const runs = runRows as any[];
      if (!runs[0]) {
        throw new Error('Compliance run not found');
      }

      const run = runs[0];

      // Get departments for this run
      const [deptRows] = await connection.execute(
        `SELECT d.id, d.name 
         FROM compliance_run_departments crd 
         JOIN departments d ON crd.department_id = d.id 
         WHERE crd.compliance_run_id = ?`,
        [runId]
      );

      // Get department heads from these departments
      const depts = deptRows as any[];
      const deptIds = depts.map((row: any) => row.id);
      if (deptIds.length === 0) {
        throw new Error('No departments found for this compliance run');
      }

      const [userRows] = await connection.execute(
        `SELECT u.id, u.email, u.full_name, d.id as department_id, d.name as department_name 
         FROM departments d 
         JOIN users u ON d.head_user_id = u.id 
         WHERE d.id IN (${deptIds.map(() => '?').join(',')}) 
         AND u.status = 'active'`,
        deptIds
      );

      // Create recipients and send emails
      const users = userRows as any[];
      
      if (users.length === 0) {
        throw new Error('No department heads found for the selected departments. Please ensure all departments have heads assigned.');
      }
      
      for (const user of users) {
        const recipientId = generateUUID();
        const surveyToken = crypto.randomBytes(32).toString('hex');
        const surveyLink = `${process.env.FRONTEND_URL || 'http://localhost:5176'}/compliance-survey/${surveyToken}`;

        // Create recipient record
        await connection.execute(
          `INSERT INTO compliance_recipients (id, compliance_run_id, user_id, department_id, survey_link_token) 
           VALUES (?, ?, ?, ?, ?)`,
          [recipientId, runId, user.id, user.department_id, surveyToken]
        );

        // Send email notification
        const emailData: ComplianceSurveyData = {
          complianceRunId: runId,
          complianceRunTitle: run.title,
          complianceRunDescription: run.description,
          dueDate: new Date(run.due_date).toLocaleDateString(),
          recipientName: user.full_name,
          recipientEmail: user.email,
          surveyLink,
          departmentName: user.department_name,
          createdByName: run.created_by_name
        };

        const emailSent = await EmailService.sendComplianceSurveyNotification(emailData);

        if (emailSent) {
          await connection.execute(
            `UPDATE compliance_recipients SET email_sent = TRUE, email_sent_at = NOW() WHERE id = ?`,
            [recipientId]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error activating compliance run:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get compliance run by token
   */
  static async getComplianceRunByToken(token: string): Promise<{
    run: ComplianceRun;
    questions: ComplianceQuestion[];
    recipient: ComplianceRecipient;
  } | null> {
    const connection = await pool.getConnection();
    
    try {
      // Get recipient and run details
      const [recipientRows] = await connection.execute(
        `SELECT cr.*, crun.* 
         FROM compliance_recipients cr 
         JOIN compliance_runs crun ON cr.compliance_run_id = crun.id 
         WHERE cr.survey_link_token = ?`,
        [token]
      );

      const recipients = recipientRows as any[];
      
      if (!recipients[0]) {
        return null;
      }

      const recipient = {
        id: recipients[0].id,
        complianceRunId: recipients[0].compliance_run_id,
        userId: recipients[0].user_id,
        departmentId: recipients[0].department_id,
        emailSent: recipients[0].email_sent === 1,
        emailSentAt: recipients[0].email_sent_at,
        surveyCompleted: recipients[0].survey_completed === 1,
        surveyCompletedAt: recipients[0].survey_completed_at,
        surveyLinkToken: recipients[0].survey_link_token,
        createdAt: recipients[0].created_at,
        updatedAt: recipients[0].updated_at
      } as ComplianceRecipient;
      
      const run = {
        id: recipients[0].compliance_run_id,
        title: recipients[0].title,
        description: recipients[0].description,
        frequency: recipients[0].frequency,
        startDate: recipients[0].start_date,
        dueDate: recipients[0].due_date,
        status: recipients[0].status,
        createdBy: recipients[0].created_by,
        createdAt: recipients[0].created_at,
        updatedAt: recipients[0].updated_at
      } as ComplianceRun;

      // Get questions
      const [questionRows] = await connection.execute(
        `SELECT id, compliance_run_id, question_text, question_type, is_required, options, max_score, order_index, created_at FROM compliance_questions 
         WHERE compliance_run_id = ? 
         ORDER BY order_index`,
        [run.id]
      );

      const questions = (questionRows as any[]).map((row: any) => {
        let parsedOptions;
        
        // Handle options parsing
        if (row.options) {
          if (typeof row.options === 'string') {
            try {
              parsedOptions = JSON.parse(row.options);
            } catch (error) {
              parsedOptions = undefined;
            }
          } else if (Array.isArray(row.options)) {
            parsedOptions = row.options;
          } else {
            parsedOptions = undefined;
          }
        } else {
          parsedOptions = undefined;
        }
        
        return {
          id: row.id,
          complianceRunId: row.compliance_run_id,
          questionText: row.question_text,
          questionType: row.question_type,
          isRequired: row.is_required === 1,
          options: parsedOptions,
          maxScore: row.max_score,
          orderIndex: row.order_index,
          createdAt: row.created_at
        };
      }) as ComplianceQuestion[];

      return { run, questions, recipient };
    } catch (error) {
      console.error('Error getting compliance run by token:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Submit compliance survey responses
   */
  static async submitComplianceResponses(
    token: string,
    responses: Array<{
      questionId: string;
      answer?: string;
      score?: number;
      comment?: string;
    }>
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get recipient
      const [recipientRows] = await connection.execute(
        `SELECT * FROM compliance_recipients WHERE survey_link_token = ?`,
        [token]
      );

      const recipients = recipientRows as any[];
      
      if (!recipients[0]) {
        throw new Error('Invalid survey token');
      }

      const recipient = recipients[0];

      // Check if survey has already been completed
      if (recipient.survey_completed) {
        throw new Error('Survey has already been completed');
      }

      // Validate that all question IDs exist for this compliance run
      const questionIds = responses.map(r => r.questionId);
      const [questionRows] = await connection.execute(
        `SELECT id FROM compliance_questions 
         WHERE compliance_run_id = ? AND id IN (${questionIds.map(() => '?').join(',')})`,
        [recipient.compliance_run_id, ...questionIds]
      );

      const validQuestionIds = (questionRows as any[]).map(row => row.id);
      const invalidQuestionIds = questionIds.filter(id => !validQuestionIds.includes(id));

      if (invalidQuestionIds.length > 0) {
        throw new Error(`Invalid question IDs: ${invalidQuestionIds.join(', ')}`);
      }

      // Save responses
      for (const response of responses) {
        // Ensure all values are properly converted to null if undefined
        const answer = response.answer !== undefined ? String(response.answer) : null;
        const score = response.score !== undefined ? Number(response.score) : null;
        const comment = response.comment !== undefined ? String(response.comment) : null;
        
        console.log('Inserting response:', {
          questionId: response.questionId,
          answer,
          score,
          comment,
          compliance_run_id: recipient.compliance_run_id,
          user_id: recipient.user_id
        });
        
        await connection.execute(
          `INSERT INTO compliance_responses (id, compliance_run_id, user_id, question_id, answer, score, comment) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            recipient.compliance_run_id,
            recipient.user_id,
            response.questionId,
            answer,
            score,
            comment
          ]
        );
      }

      // Mark survey as completed
      await connection.execute(
        `UPDATE compliance_recipients 
         SET survey_completed = TRUE, survey_completed_at = NOW() 
         WHERE id = ?`,
        [recipient.id]
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Error submitting compliance responses:', error);
      console.error('Error details:', {
        token,
        responsesCount: responses.length,
        recipient: recipient ? {
          id: recipient.id,
          compliance_run_id: recipient.compliance_run_id,
          user_id: recipient.user_id
        } : 'No recipient found'
      });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all compliance runs
   */
  static async getComplianceRuns(): Promise<ComplianceRun[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT cr.*, u.full_name as created_by_name,
         (SELECT COUNT(*) FROM compliance_recipients WHERE compliance_run_id = cr.id) as total_recipients,
         (SELECT COUNT(*) FROM compliance_recipients WHERE compliance_run_id = cr.id AND survey_completed = TRUE) as completed_surveys
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         ORDER BY cr.created_at DESC`
      );

      return rows as ComplianceRun[];
    } catch (error) {
      console.error('Error getting compliance runs:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get survey responses for a compliance run
   */
  static async getSurveyResponses(runId: string): Promise<{
    run: ComplianceRun;
    questions: ComplianceQuestion[];
    responses: Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      departmentName: string;
      questionId: string;
      questionText: string;
      questionType: string;
      answer: string | null;
      score: number | null;
      comment: string | null;
      submittedAt: string;
    }>;
  }> {
    const connection = await pool.getConnection();
    
    try {
      // Get run details
      const [runRows] = await connection.execute(
        `SELECT cr.*, u.full_name as created_by_name 
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [runId]
      );

      const runs = runRows as any[];
      if (!runs[0]) {
        throw new Error('Compliance run not found');
      }

      const run = runs[0] as ComplianceRun;

      // Get questions
      const [questionRows] = await connection.execute(
        `SELECT * FROM compliance_questions 
         WHERE compliance_run_id = ? 
         ORDER BY order_index`,
        [runId]
      );

      const questions = questionRows as ComplianceQuestion[];

      // Get responses with user and department details
      const [responseRows] = await connection.execute(
        `SELECT 
          cr.id,
          cr.user_id,
          u.full_name as user_name,
          u.email as user_email,
          d.name as department_name,
          cr.question_id,
          cq.question_text,
          cq.question_type,
          cr.answer,
          cr.score,
          cr.comment,
          cr.created_at as submitted_at
         FROM compliance_responses cr
         JOIN users u ON cr.user_id = u.id
         JOIN compliance_recipients crp ON cr.user_id = crp.user_id AND cr.compliance_run_id = crp.compliance_run_id
         JOIN departments d ON crp.department_id = d.id
         JOIN compliance_questions cq ON cr.question_id = cq.id
         WHERE cr.compliance_run_id = ?
         ORDER BY cr.created_at DESC`,
        [runId]
      );

      const responses = responseRows as any[];

      return { run, questions, responses };
    } catch (error) {
      console.error('Error getting survey responses:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Generate survey report as JSON
   */
  static async generateSurveyReport(runId: string): Promise<{
    run: ComplianceRun;
    questions: ComplianceQuestion[];
    responses: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      departmentName: string;
      responses: Array<{
        questionId: string;
        questionText: string;
        questionType: string;
        answer: string | null;
        score: number | null;
        comment: string | null;
      }>;
      submittedAt: string;
    }>;
    statistics: {
      totalResponses: number;
      totalRecipients: number;
      completionRate: number;
      averageScore: number;
    };
  }> {
    const connection = await pool.getConnection();
    
    try {
      // Get run details
      const [runRows] = await connection.execute(
        `SELECT cr.*, u.full_name as created_by_name 
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [runId]
      );

      const runs = runRows as any[];
      if (!runs[0]) {
        throw new Error('Compliance run not found');
      }

      const run = runs[0] as ComplianceRun;

      // Get questions
      const [questionRows] = await connection.execute(
        `SELECT * FROM compliance_questions 
         WHERE compliance_run_id = ? 
         ORDER BY order_index`,
        [runId]
      );

      const questions = questionRows as ComplianceQuestion[];

      // Get all responses grouped by user
      const [responseRows] = await connection.execute(
        `SELECT 
          cr.user_id,
          u.full_name as user_name,
          u.email as user_email,
          d.name as department_name,
          cr.question_id,
          cq.question_text,
          cq.question_type,
          cr.answer,
          cr.score,
          cr.comment,
          cr.created_at as submitted_at
         FROM compliance_responses cr
         JOIN users u ON cr.user_id = u.id
         JOIN compliance_recipients crp ON cr.user_id = crp.user_id AND cr.compliance_run_id = crp.compliance_run_id
         JOIN departments d ON crp.department_id = d.id
         JOIN compliance_questions cq ON cr.question_id = cq.id
         WHERE cr.compliance_run_id = ?
         ORDER BY cr.user_id, cq.order_index`,
        [runId]
      );

      const allResponses = responseRows as any[];

      // Group responses by user
      const userResponses = new Map();
      allResponses.forEach(response => {
        if (!userResponses.has(response.user_id)) {
          userResponses.set(response.user_id, {
            userId: response.user_id,
            userName: response.user_name,
            userEmail: response.user_email,
            departmentName: response.department_name,
            responses: [],
            submittedAt: response.submitted_at
          });
        }
        
        userResponses.get(response.user_id).responses.push({
          questionId: response.question_id,
          questionText: response.question_text,
          questionType: response.question_type,
          answer: response.answer,
          score: response.score,
          comment: response.comment
        });
      });

      // Get statistics
      const [statsRows] = await connection.execute(
        `SELECT 
          COUNT(DISTINCT cr.user_id) as total_responses,
          (SELECT COUNT(*) FROM compliance_recipients WHERE compliance_run_id = ?) as total_recipients,
          AVG(cr.score) as average_score
         FROM compliance_responses cr
         WHERE cr.compliance_run_id = ?`,
        [runId, runId]
      );

      const stats = statsRows[0] as any;
      const completionRate = stats.total_recipients > 0 ? (stats.total_responses / stats.total_recipients) * 100 : 0;

      return {
        run,
        questions,
        responses: Array.from(userResponses.values()),
        statistics: {
          totalResponses: stats.total_responses || 0,
          totalRecipients: stats.total_recipients || 0,
          completionRate: Math.round(completionRate * 100) / 100,
          averageScore: Math.round((stats.average_score || 0) * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error generating survey report:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get compliance run details with statistics
   */
  static async getComplianceRunDetails(runId: string): Promise<{
    run: ComplianceRun;
    questions: ComplianceQuestion[];
    recipients: ComplianceRecipient[];
    statistics: {
      totalRecipients: number;
      completedSurveys: number;
      pendingSurveys: number;
      completionRate: number;
    };
  }> {
    const connection = await pool.getConnection();
    
    try {
      // Get run details
      const [runRows] = await connection.execute(
        `SELECT cr.*, u.full_name as created_by_name 
         FROM compliance_runs cr 
         JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [runId]
      );

      const runs = runRows as any[];
      if (!runs[0]) {
        throw new Error('Compliance run not found');
      }

      const run = runs[0] as ComplianceRun;

      // Get questions
      const [questionRows] = await connection.execute(
        `SELECT * FROM compliance_questions 
         WHERE compliance_run_id = ? 
         ORDER BY order_index`,
        [runId]
      );

      const questions = (questionRows as any[]).map((row: any) => {
        let parsedOptions;
        try {
          parsedOptions = row.options && row.options !== '[]' ? JSON.parse(row.options) : undefined;
        } catch (error) {
          parsedOptions = undefined;
        }
        
        return {
          id: row.id,
          complianceRunId: row.compliance_run_id,
          questionText: row.question_text,
          questionType: row.question_type,
          isRequired: row.is_required === 1,
          options: parsedOptions,
          maxScore: row.max_score,
          orderIndex: row.order_index,
          createdAt: row.created_at
        };
      }) as ComplianceQuestion[];

      // Get recipients
      const [recipientRows] = await connection.execute(
        `SELECT cr.*, u.full_name as user_name, u.email, d.name as department_name 
         FROM compliance_recipients cr 
         JOIN users u ON cr.user_id = u.id 
         JOIN departments d ON cr.department_id = d.id 
         WHERE cr.compliance_run_id = ?`,
        [runId]
      );

      const recipients = (recipientRows as any[]).map((row: any) => ({
        id: row.id,
        complianceRunId: row.compliance_run_id,
        userId: row.user_id,
        departmentId: row.department_id,
        emailSent: row.email_sent === 1,
        emailSentAt: row.email_sent_at,
        surveyCompleted: row.survey_completed === 1,
        surveyCompletedAt: row.survey_completed_at,
        surveyLinkToken: row.survey_link_token,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userName: row.user_name,
        email: row.email,
        departmentName: row.department_name
      })) as ComplianceRecipient[];

      // Calculate statistics
      const totalRecipients = recipients.length;
      const completedSurveys = recipients.filter(r => r.surveyCompleted).length;
      const pendingSurveys = totalRecipients - completedSurveys;
      const completionRate = totalRecipients > 0 ? (completedSurveys / totalRecipients) * 100 : 0;

      return {
        run,
        questions,
        recipients,
        statistics: {
          totalRecipients,
          completedSurveys,
          pendingSurveys,
          completionRate
        }
      };
    } catch (error) {
      console.error('Error getting compliance run details:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Calculate the next run date for recurring surveys
   */
  static calculateNextRunDate(frequency: string, recurringDay: number, startDate: Date): Date {
    const now = new Date();
    let nextDate = new Date(startDate);
    
    // If start date is in the past, calculate from today
    if (nextDate < now) {
      nextDate = new Date(now);
    }

    switch (frequency) {
      case 'weekly':
        // Set to the specified day of the week
        const currentDay = nextDate.getDay();
        const targetDay = recurringDay - 1; // Convert to 0-based index
        const daysToAdd = (targetDay - currentDay + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        break;
        
      case 'monthly':
        // Set to the specified day of the month
        nextDate.setDate(recurringDay);
        // If the date has passed this month, move to next month
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(recurringDay);
        }
        break;
        
      case 'quarterly':
        // Set to the specified day of the quarter
        const quarter = Math.floor(nextDate.getMonth() / 3);
        const quarterStartMonth = quarter * 3;
        nextDate.setMonth(quarterStartMonth);
        nextDate.setDate(recurringDay);
        // If the date has passed this quarter, move to next quarter
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 3);
          nextDate.setDate(recurringDay);
        }
        break;
        
      case 'annually':
        // Set to the specified day of the year
        nextDate.setMonth(0); // January
        nextDate.setDate(recurringDay);
        // If the date has passed this year, move to next year
        if (nextDate <= now) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        break;
        
      case 'bimonthly':
        // Set to the specified day every 2 months
        nextDate.setDate(recurringDay);
        // If the date has passed this bimonth, move to next bimonth
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 2);
          nextDate.setDate(recurringDay);
        }
        break;
        
      default:
        return nextDate;
    }
    
    return nextDate;
  }
}
