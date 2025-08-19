import { pool } from './database';
import { EmailService, ContractExpiryData } from './emailService';

interface ContractExpiryNotification {
  id: string;
  contract_id: string;
  notification_type: '3_months' | '2_months' | '1_month' | '2_weeks' | 'expired';
  sent_at: string;
  recipients: string; // JSON array of email addresses
}

export class ContractExpiryService {
  /**
   * Check for contracts that are approaching expiry and send notifications
   */
  static async checkAndSendExpiryNotifications(): Promise<void> {
    try {
      console.log('🔍 Checking for contracts approaching expiry...');
      
      const connection = await pool.getConnection();
      
      // Get all active contracts with end dates
      const [contracts] = await connection.execute(`
        SELECT 
          c.id,
          c.title,
          c.contract_number,
          c.end_date,
          c.status,
          c.value,
          c.currency,
          ct.name as contract_type_name,
          d.name as department_name,
          d.head_user_id
        FROM contracts c
        LEFT JOIN contract_types ct ON c.contract_type_id = ct.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.end_date IS NOT NULL 
        AND c.status NOT IN ('expired', 'terminated')
        AND c.end_date >= CURDATE()
        ORDER BY c.end_date ASC
      `);

      const today = new Date();
      const contractsToNotify = [];

      for (const contract of contracts as any[]) {
        const endDate = new Date(contract.end_date);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if notification should be sent based on days until expiry
        if (daysUntilExpiry === 90 || daysUntilExpiry === 60 || daysUntilExpiry === 30 || 
            daysUntilExpiry === 14 || daysUntilExpiry === 0) {
          
          // Check if notification was already sent for this contract and day
          const [existingNotifications] = await connection.execute(`
            SELECT * FROM contract_expiry_notifications 
            WHERE contract_id = ? AND notification_type = ? AND DATE(sent_at) = CURDATE()
          `, [contract.id, this.getNotificationType(daysUntilExpiry)]);

          if ((existingNotifications as any[]).length === 0) {
            contractsToNotify.push({
              contract,
              daysUntilExpiry,
              notificationType: this.getNotificationType(daysUntilExpiry)
            });
          }
        }
      }

      // Send notifications for each contract
      for (const { contract, daysUntilExpiry, notificationType } of contractsToNotify) {
        await this.sendContractExpiryNotification(contract, daysUntilExpiry, notificationType, connection);
      }

      connection.release();
      
      if (contractsToNotify.length > 0) {
        console.log(`✅ Sent ${contractsToNotify.length} contract expiry notifications`);
      } else {
        console.log('ℹ️ No contract expiry notifications needed');
      }
    } catch (error) {
      console.error('❌ Error checking contract expiry notifications:', error);
    }
  }

  /**
   * Get notification type based on days until expiry
   */
  private static getNotificationType(daysUntilExpiry: number): '3_months' | '2_months' | '1_month' | '2_weeks' | 'expired' {
    switch (daysUntilExpiry) {
      case 90:
        return '3_months';
      case 60:
        return '2_months';
      case 30:
        return '1_month';
      case 14:
        return '2_weeks';
      case 0:
        return 'expired';
      default:
        return '1_month'; // fallback
    }
  }

  /**
   * Send expiry notification for a specific contract
   */
  private static async sendContractExpiryNotification(
    contract: any, 
    daysUntilExpiry: number, 
    notificationType: '3_months' | '2_months' | '1_month' | '2_weeks' | 'expired',
    connection: any
  ): Promise<void> {
    try {
      // Get legal department users
      const [legalDept] = await connection.execute(`
        SELECT d.id FROM departments d WHERE LOWER(d.name) LIKE '%legal department%'
      `);
      
      let legalUsers: any[] = [];
      if ((legalDept as any[]).length > 0) {
        const legalDeptId = (legalDept as any[])[0].id;
        const [legalUsersResult] = await connection.execute(`
          SELECT u.id, u.email, u.full_name
          FROM users u
          JOIN user_departments ud ON u.id = ud.user_id
          WHERE ud.department_id = ? AND u.status = 'active'
        `, [legalDeptId]);
        legalUsers = legalUsersResult as any[];
      }

      // Get department head if contract has a department
      let departmentHead: any = null;
      if (contract.head_user_id) {
        const [headResult] = await connection.execute(`
          SELECT id, email, full_name FROM users WHERE id = ? AND status = 'active'
        `, [contract.head_user_id]);
        if ((headResult as any[]).length > 0) {
          departmentHead = (headResult as any[])[0];
        }
      }

      // Combine all recipients
      const recipients = [...legalUsers];
      if (departmentHead && !recipients.find(r => r.id === departmentHead.id)) {
        recipients.push(departmentHead);
      }

      if (recipients.length === 0) {
        console.log(`⚠️ No recipients found for contract ${contract.id}`);
        return;
      }

      // Prepare contract data for email
      const contractData: ContractExpiryData = {
        contractId: contract.id,
        contractTitle: contract.title,
        contractNumber: contract.contract_number,
        endDate: contract.end_date,
        daysUntilExpiry,
        departmentName: contract.department_name || 'No Department',
        contractType: contract.contract_type_name || 'Unknown Type',
        contractValue: contract.value,
        currency: contract.currency
      };

      // Determine email type
      let emailType: 'reminder' | 'urgent' | 'expired';
      if (notificationType === '2_weeks' || notificationType === 'expired') {
        emailType = notificationType === 'expired' ? 'expired' : 'urgent';
      } else {
        emailType = 'reminder';
      }

      // Send emails to all recipients
      const sentEmails: string[] = [];
      for (const recipient of recipients) {
        try {
          await EmailService.sendContractExpiryNotification(
            contractData,
            recipient.email,
            recipient.full_name,
            emailType
          );
          sentEmails.push(recipient.email);
        } catch (error) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, error);
        }
      }

      // Record the notification in database
      if (sentEmails.length > 0) {
        await connection.execute(`
          INSERT INTO contract_expiry_notifications (
            id, contract_id, notification_type, sent_at, recipients
          ) VALUES (UUID(), ?, ?, NOW(), ?)
        `, [contract.id, notificationType, JSON.stringify(sentEmails)]);

        console.log(`✅ Sent ${sentEmails.length} expiry notifications for contract ${contract.contract_number}`);
      }

    } catch (error) {
      console.error(`❌ Error sending expiry notification for contract ${contract.id}:`, error);
    }
  }

  /**
   * Initialize the contract expiry notification table
   */
  static async initializeNotificationTable(): Promise<void> {
    try {
      const connection = await pool.getConnection();
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS contract_expiry_notifications (
          id VARCHAR(36) PRIMARY KEY,
          contract_id VARCHAR(36) NOT NULL,
          notification_type ENUM('3_months', '2_months', '1_month', '2_weeks', 'expired') NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          recipients JSON,
          
          FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
          INDEX idx_contract_id (contract_id),
          INDEX idx_notification_type (notification_type),
          INDEX idx_sent_at (sent_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      connection.release();
      console.log('✅ Contract expiry notifications table initialized');
    } catch (error) {
      console.error('❌ Error initializing contract expiry notifications table:', error);
    }
  }

  /**
   * Start the scheduled job to check for expiring contracts
   */
  static startScheduledJob(): void {
    // Check every day at 9:00 AM
    const checkTime = 9 * 60 * 60 * 1000; // 9 AM in milliseconds
    const now = new Date();
    const nextCheck = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    
    if (nextCheck.getTime() <= now.getTime()) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }

    const timeUntilNextCheck = nextCheck.getTime() - now.getTime();

    // Schedule the first check
    setTimeout(() => {
      this.checkAndSendExpiryNotifications();
      
      // Then schedule daily checks
      setInterval(() => {
        this.checkAndSendExpiryNotifications();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilNextCheck);

    console.log(`⏰ Contract expiry notification job scheduled to start at ${nextCheck.toLocaleString()}`);
  }
}
