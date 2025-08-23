import { pool, generateUUID } from './database';

export interface GeneralComplianceRecord {
  id: string;
  name: string;
  description?: string;
  complianceType: 'tax_return' | 'license_renewal' | 'certification' | 'registration' | 'permit' | 'insurance' | 'audit' | 'report' | 'other';
  dueDate: string;
  dueDay?: number; // Day of month for recurring items (1-31)
  expiryDate?: string;
  renewalDate?: string;
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually' | 'biennially' | 'custom';
  status: 'active' | 'pending' | 'overdue' | 'completed' | 'expired';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  departmentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields for display
  assignedToName?: string;
  departmentName?: string;
  createdByName?: string;
}

export interface CreateComplianceRecordData {
  name: string;
  description?: string;
  complianceType: string;
  dueDate: string;
  dueDay?: number;
  expiryDate?: string;
  renewalDate?: string;
  frequency: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  departmentId?: string;
  createdBy: string;
}

export interface UpdateComplianceRecordData {
  name?: string;
  description?: string;
  complianceType?: string;
  dueDate?: string;
  dueDay?: number;
  expiryDate?: string;
  renewalDate?: string;
  frequency?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  departmentId?: string;
}

export class GeneralComplianceService {
  /**
   * Create a new compliance record
   */
  static async createComplianceRecord(data: CreateComplianceRecordData): Promise<GeneralComplianceRecord> {
    const connection = await pool.getConnection();
    
    try {
      const id = generateUUID();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      await connection.execute(
        `INSERT INTO general_compliance_records (
          id, name, description, compliance_type, due_date, due_day, expiry_date, renewal_date, 
          frequency, status, priority, assigned_to, department_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.description || null,
          data.complianceType,
          data.dueDate || null,
          data.dueDay || null,
          data.expiryDate || null,
          data.renewalDate || null,
          data.frequency,
          data.status || 'active',
          data.priority || 'medium',
          data.assignedTo || null,
          data.departmentId || null,
          data.createdBy,
          now,
          now
        ]
      );

      // Get the created record with additional details
      const [rows] = await connection.execute(
        `SELECT gcr.*, 
         u1.full_name as assigned_to_name,
         d.name as department_name,
         u2.full_name as created_by_name
         FROM general_compliance_records gcr
         LEFT JOIN users u1 ON gcr.assigned_to = u1.id
         LEFT JOIN departments d ON gcr.department_id = d.id
         JOIN users u2 ON gcr.created_by = u2.id
         WHERE gcr.id = ?`,
        [id]
      );

      const records = rows as any[];
      return this.mapDatabaseRecordToInterface(records[0]);
    } catch (error) {
      console.error('Error creating compliance record:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all compliance records with optional filtering
   */
  static async getComplianceRecords(filters?: {
    status?: string;
    priority?: string;
    complianceType?: string;
    assignedTo?: string;
    departmentId?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  }): Promise<GeneralComplianceRecord[]> {
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT gcr.*, 
         u1.full_name as assigned_to_name,
         d.name as department_name,
         u2.full_name as created_by_name
         FROM general_compliance_records gcr
         LEFT JOIN users u1 ON gcr.assigned_to = u1.id
         LEFT JOIN departments d ON gcr.department_id = d.id
         JOIN users u2 ON gcr.created_by = u2.id
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters?.status) {
        conditions.push('gcr.status = ?');
        params.push(filters.status);
      }

      if (filters?.priority) {
        conditions.push('gcr.priority = ?');
        params.push(filters.priority);
      }

      if (filters?.complianceType) {
        conditions.push('gcr.compliance_type = ?');
        params.push(filters.complianceType);
      }

      if (filters?.assignedTo) {
        conditions.push('gcr.assigned_to = ?');
        params.push(filters.assignedTo);
      }

      if (filters?.departmentId) {
        conditions.push('gcr.department_id = ?');
        params.push(filters.departmentId);
      }

      if (filters?.dueDateFrom) {
        conditions.push('gcr.due_date >= ?');
        params.push(filters.dueDateFrom);
      }

      if (filters?.dueDateTo) {
        conditions.push('gcr.due_date <= ?');
        params.push(filters.dueDateTo);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY gcr.due_date ASC, gcr.priority DESC';

      const [rows] = await connection.execute(query, params);
      return (rows as any[]).map(record => this.mapDatabaseRecordToInterface(record));
    } catch (error) {
      console.error('Error getting compliance records:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get a single compliance record by ID
   */
  static async getComplianceRecordById(id: string): Promise<GeneralComplianceRecord | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT gcr.*, 
         u1.full_name as assigned_to_name,
         d.name as department_name,
         u2.full_name as created_by_name
         FROM general_compliance_records gcr
         LEFT JOIN users u1 ON gcr.assigned_to = u1.id
         LEFT JOIN departments d ON gcr.department_id = d.id
         JOIN users u2 ON gcr.created_by = u2.id
         WHERE gcr.id = ?`,
        [id]
      );

      const records = rows as any[];
      if (records.length === 0) {
        return null;
      }

      return this.mapDatabaseRecordToInterface(records[0]);
    } catch (error) {
      console.error('Error getting compliance record by ID:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update a compliance record
   */
  static async updateComplianceRecord(id: string, data: UpdateComplianceRecordData): Promise<GeneralComplianceRecord> {
    const connection = await pool.getConnection();
    
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        params.push(data.name);
      }

      if (data.description !== undefined) {
        updateFields.push('description = ?');
        params.push(data.description);
      }

      if (data.complianceType !== undefined) {
        updateFields.push('compliance_type = ?');
        params.push(data.complianceType);
      }

      if (data.dueDate !== undefined) {
        updateFields.push('due_date = ?');
        params.push(data.dueDate);
      }

      if (data.dueDay !== undefined) {
        updateFields.push('due_day = ?');
        params.push(data.dueDay);
      }

      if (data.expiryDate !== undefined) {
        updateFields.push('expiry_date = ?');
        params.push(data.expiryDate);
      }

      if (data.renewalDate !== undefined) {
        updateFields.push('renewal_date = ?');
        params.push(data.renewalDate);
      }

      if (data.frequency !== undefined) {
        updateFields.push('frequency = ?');
        params.push(data.frequency);
      }

      if (data.status !== undefined) {
        updateFields.push('status = ?');
        params.push(data.status);
      }

      if (data.priority !== undefined) {
        updateFields.push('priority = ?');
        params.push(data.priority);
      }

      if (data.assignedTo !== undefined) {
        updateFields.push('assigned_to = ?');
        params.push(data.assignedTo);
      }

      if (data.departmentId !== undefined) {
        updateFields.push('department_id = ?');
        params.push(data.departmentId);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = NOW()');
      params.push(id);

      await connection.execute(
        `UPDATE general_compliance_records SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Get the updated record
      const updatedRecord = await this.getComplianceRecordById(id);
      if (!updatedRecord) {
        throw new Error('Compliance record not found after update');
      }

      return updatedRecord;
    } catch (error) {
      console.error('Error updating compliance record:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a compliance record
   */
  static async deleteComplianceRecord(id: string): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'DELETE FROM general_compliance_records WHERE id = ?',
        [id]
      );

      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error('Error deleting compliance record:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get overdue compliance records
   */
  static async getOverdueRecords(): Promise<GeneralComplianceRecord[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT gcr.*, 
         u1.full_name as assigned_to_name,
         d.name as department_name,
         u2.full_name as created_by_name
         FROM general_compliance_records gcr
         LEFT JOIN users u1 ON gcr.assigned_to = u1.id
         LEFT JOIN departments d ON gcr.department_id = d.id
         JOIN users u2 ON gcr.created_by = u2.id
         WHERE gcr.due_date < CURDATE() AND gcr.status IN ('active', 'pending')
         ORDER BY gcr.due_date ASC, gcr.priority DESC`
      );

      return (rows as any[]).map(record => this.mapDatabaseRecordToInterface(record));
    } catch (error) {
      console.error('Error getting overdue records:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get upcoming due records (due within the next 30 days)
   */
  static async getUpcomingDueRecords(days: number = 30): Promise<GeneralComplianceRecord[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT gcr.*, 
         u1.full_name as assigned_to_name,
         d.name as department_name,
         u2.full_name as created_by_name
         FROM general_compliance_records gcr
         LEFT JOIN users u1 ON gcr.assigned_to = u1.id
         LEFT JOIN departments d ON gcr.department_id = d.id
         JOIN users u2 ON gcr.created_by = u2.id
         WHERE gcr.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) 
         AND gcr.status IN ('active', 'pending')
         ORDER BY gcr.due_date ASC, gcr.priority DESC`,
        [days]
      );

      return (rows as any[]).map(record => this.mapDatabaseRecordToInterface(record));
    } catch (error) {
      console.error('Error getting upcoming due records:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Helper method to map database record to interface
   */
  private static mapDatabaseRecordToInterface(record: any): GeneralComplianceRecord {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      complianceType: record.compliance_type,
      dueDate: record.due_date,
      dueDay: record.due_day,
      expiryDate: record.expiry_date,
      renewalDate: record.renewal_date,
      frequency: record.frequency,
      status: record.status,
      priority: record.priority,
      assignedTo: record.assigned_to,
      departmentId: record.department_id,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      assignedToName: record.assigned_to_name,
      departmentName: record.department_name,
      createdByName: record.created_by_name
    };
  }
}
