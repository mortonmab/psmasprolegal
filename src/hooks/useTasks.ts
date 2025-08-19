import { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import type { Task } from '../lib/types';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getAllTasks();
      setTasks(data || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function createTask(newTask: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
    try {
      setError(null);
      const created = await taskService.createTask(newTask);
      setTasks(prev => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Error creating task:', err);
      const error = err instanceof Error ? err : new Error('Failed to create task');
      setError(error);
      throw error;
    }
  }

  async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>) {
    try {
      setError(null);
      const updated = await taskService.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      console.error('Error updating task:', err);
      const error = err instanceof Error ? err : new Error('Failed to update task');
      setError(error);
      throw error;
    }
  }

  async function deleteTask(id: string) {
    try {
      setError(null);
      await taskService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
      const error = err instanceof Error ? err : new Error('Failed to delete task');
      setError(error);
      throw error;
    }
  }

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refresh: loadTasks
  };
}
