import { pool, generateUUID } from './database';

export interface ExternalUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExternalUserData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
}

export interface UpdateExternalUserData {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
}

export class ExternalUserService {
  /**
   * Create a new external user
   */
  static async createExternalUser(data: CreateExternalUserData): Promise<ExternalUser> {
    const connection = await pool.getConnection();
    
    try {
      const id = generateUUID();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      await connection.execute(
        `INSERT INTO external_users (id, name, email, phone, organization, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.email, data.phone || null, data.organization || null, now, now]
      );

      // Get the created user
      const [rows] = await connection.execute(
        `SELECT * FROM external_users WHERE id = ?`,
        [id]
      );

      const users = rows as any[];
      return this.mapDatabaseRecordToInterface(users[0]);
    } catch (error) {
      console.error('Error creating external user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all external users
   */
  static async getExternalUsers(): Promise<ExternalUser[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM external_users ORDER BY name`
      );

      return (rows as any[]).map(record => this.mapDatabaseRecordToInterface(record));
    } catch (error) {
      console.error('Error getting external users:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get external user by ID
   */
  static async getExternalUserById(id: string): Promise<ExternalUser | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM external_users WHERE id = ?`,
        [id]
      );

      const users = rows as any[];
      if (users.length === 0) {
        return null;
      }

      return this.mapDatabaseRecordToInterface(users[0]);
    } catch (error) {
      console.error('Error getting external user by ID:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get external user by email
   */
  static async getExternalUserByEmail(email: string): Promise<ExternalUser | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM external_users WHERE email = ?`,
        [email]
      );

      const users = rows as any[];
      if (users.length === 0) {
        return null;
      }

      return this.mapDatabaseRecordToInterface(users[0]);
    } catch (error) {
      console.error('Error getting external user by email:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update external user
   */
  static async updateExternalUser(id: string, data: UpdateExternalUserData): Promise<ExternalUser> {
    const connection = await pool.getConnection();
    
    try {
      const updateFields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updateFields.push('name = ?');
        params.push(data.name);
      }

      if (data.email !== undefined) {
        updateFields.push('email = ?');
        params.push(data.email);
      }

      if (data.phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(data.phone);
      }

      if (data.organization !== undefined) {
        updateFields.push('organization = ?');
        params.push(data.organization);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = NOW()');
      params.push(id);

      await connection.execute(
        `UPDATE external_users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      // Get the updated user
      const updatedUser = await this.getExternalUserById(id);
      if (!updatedUser) {
        throw new Error('External user not found after update');
      }

      return updatedUser;
    } catch (error) {
      console.error('Error updating external user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete external user
   */
  static async deleteExternalUser(id: string): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'DELETE FROM external_users WHERE id = ?',
        [id]
      );

      return (result as any).affectedRows > 0;
    } catch (error) {
      console.error('Error deleting external user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Helper method to map database record to interface
   */
  private static mapDatabaseRecordToInterface(record: any): ExternalUser {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      organization: record.organization,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
}
