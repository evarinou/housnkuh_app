/**
 * @file Booking event system for handling booking status changes
 * @description Event-driven system for booking status changes, notifications, and audit logging
 * @author housnkuh Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { EventEmitter } from 'events';
import { BookingStatus } from '../types/modelTypes';

/**
 * Interface for booking event data
 * @interface BookingEvent
 */
interface BookingEvent {
  /** User ID associated with the booking */
  userId: string;
  /** Unique booking identifier */
  bookingId: string;
  /** Current booking status */
  status: BookingStatus;
  /** Optional Mietfach data */
  mietfach?: any;
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Event emitter for booking status changes
 * @class BookingEventEmitter
 * @extends EventEmitter
 * @description Handles booking status change events and notifications
 */
class BookingEventEmitter extends EventEmitter {
  /**
   * Creates a new BookingEventEmitter instance
   * @constructor
   * @description Initializes event emitter with increased listener limit for multiple handlers
   * @complexity O(1)
   */
  constructor() {
    super();
    /** Allow more listeners for multiple event handlers */
    this.setMaxListeners(50);
  }

  /**
   * Emit booking status change event
   * @method emitStatusChange
   * @description Emits a status change event for a booking
   * @param {BookingEvent} bookingEvent - Booking event data
   * @returns {void}
   * @complexity O(n) where n is number of listeners
   */
  emitStatusChange(bookingEvent: BookingEvent): void {
    console.log(`Booking status changed: ${bookingEvent.bookingId} -> ${bookingEvent.status}`);
    this.emit('statusChanged', bookingEvent);
  }

  /**
   * Register status change handler
   * @method onStatusChanged
   * @description Registers a handler for booking status change events
   * @param {function} handler - Async handler function for booking events
   * @returns {void}
   * @complexity O(1)
   */
  onStatusChanged(handler: (booking: BookingEvent) => Promise<void>): void {
    this.on('statusChanged', handler);
  }
}

/**
 * Singleton booking event emitter instance
 * @constant {BookingEventEmitter} bookingEvents
 * @description Application-wide booking event emitter for status changes and notifications
 */
const bookingEvents = new BookingEventEmitter();

// Set up default event handlers
bookingEvents.onStatusChanged(async (booking: BookingEvent) => {
  try {
    console.log(`Processing status change for booking ${booking.bookingId}:`);
    console.log(`- User: ${booking.userId}`);
    console.log(`- New Status: ${booking.status}`);
    console.log(`- Timestamp: ${booking.timestamp}`);
    
    // Update dashboard notifications (placeholder)
    await updateDashboardNotifications(booking.userId, booking.status);
    
    // Queue email notifications for confirmed bookings
    if (booking.status === BookingStatus.CONFIRMED) {
      console.log(`Queueing confirmation email for user ${booking.userId}`);
      // Note: This is handled by the admin controller now with enhanced emails
      // The booking confirmation is triggered by the admin assignment process
      console.log(`Booking ${booking.bookingId} confirmed - email handled by admin flow`);
    }
    
    // Log the transition for audit purposes
    await auditLog({
      action: 'booking_status_changed',
      userId: booking.userId,
      bookingId: booking.bookingId,
      details: booking,
      timestamp: booking.timestamp
    });
    
  } catch (error) {
    console.error('Error processing booking status change:', error);
  }
});

/**
 * Helper function to update dashboard notifications
 * @function updateDashboardNotifications
 * @description Updates dashboard notifications for booking status changes
 * @param {string} userId - User ID to update notifications for
 * @param {BookingStatus} status - New booking status
 * @returns {Promise<void>} Promise resolving when notification is updated
 * @complexity O(1)
 */
async function updateDashboardNotifications(userId: string, status: BookingStatus): Promise<void> {
  // This would integrate with the dashboard notification system
  // For now, just log the action
  console.log(`Dashboard notification updated for user ${userId}: status = ${status}`);
  
  // In a full implementation, this might:
  // 1. Update a notifications collection in the database
  // 2. Send real-time updates via WebSocket
  // 3. Update cached notification data
}

/**
 * Helper function for audit logging
 * @function auditLog
 * @description Logs booking events for audit and compliance purposes
 * @param {object} entry - Audit log entry
 * @param {string} entry.action - Action being audited
 * @param {string} entry.userId - User ID associated with action
 * @param {string} entry.bookingId - Booking ID associated with action
 * @param {any} entry.details - Additional event details
 * @param {Date} entry.timestamp - Timestamp of the action
 * @returns {Promise<void>} Promise resolving when audit log is written
 * @complexity O(1)
 * @security Logs events for audit trail and compliance
 */
async function auditLog(entry: {
  action: string;
  userId: string;
  bookingId: string;
  details: any;
  timestamp: Date;
}): Promise<void> {
  // This would write to an audit log table/collection
  // For now, just log to console
  console.log('AUDIT LOG:', JSON.stringify(entry, null, 2));
  
  // In a full implementation, this might:
  // 1. Write to a dedicated audit collection
  // 2. Send to external logging service
  // 3. Update monitoring metrics
}

export { bookingEvents, BookingEvent };
export default bookingEvents;