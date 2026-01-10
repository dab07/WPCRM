'use client';

import { format, parseISO, isValid } from 'date-fns';

/**
 * Safe date formatting utilities that prevent hydration mismatches
 * by ensuring consistent formatting between server and client
 */

export function formatDate(dateString: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    return format(date, formatStr);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid date';
  }
}

export function formatDateTime(dateString: string | Date): string {
  return formatDate(dateString, 'MMM d, yyyy h:mm a');
}

export function formatDateShort(dateString: string | Date): string {
  return formatDate(dateString, 'MMM d');
}

export function formatDateLong(dateString: string | Date): string {
  return formatDate(dateString, 'MMMM d, yyyy');
}

/**
 * Safe relative time formatting
 */
export function formatRelativeTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return formatDate(date, 'MMM d');
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return 'Unknown';
  }
}

/**
 * Get current timestamp in ISO format
 * Useful for consistent timestamp generation
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string | Date): boolean {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    const today = new Date();
    
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    return false;
  }
}