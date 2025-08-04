/**
 * @file Email testing utility for automated testing with Mailpit
 * @description Provides helper functions for testing email functionality using Mailpit
 * mock email server, including waiting for emails and extracting verification links
 * @author Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Interface representing a Mailpit email message
 * @interface MailpitEmail
 */
interface MailpitEmail {
  /** Email ID */
  ID: string;
  /** Recipients */
  To: { Address: string; Name: string }[];
  /** Sender */
  From: { Address: string; Name: string };
  /** Email subject */
  Subject: string;
  /** HTML content */
  HTML: string;
  /** Plain text content */
  Text: string;
  /** Creation timestamp */
  Created: string;
}

/**
 * Interface representing Mailpit search response
 * @interface MailpitSearchResponse
 */
interface MailpitSearchResponse {
  /** Total number of messages */
  total: number;
  /** Array of messages */
  messages: MailpitEmail[];
}

/**
 * Email testing helper class for Mailpit integration
 * @class EmailTestHelper
 * @description Provides methods to interact with Mailpit for email testing
 */
export class EmailTestHelper {
  /** Mailpit API URL */
  private apiUrl: string;

  /**
   * Creates an instance of EmailTestHelper
   * @param {string} mailpitUrl - Mailpit server URL
   */
  constructor(mailpitUrl: string = 'http://localhost:8025') {
    this.apiUrl = mailpitUrl;
  }

  /**
   * Waits for an email to be received by a specific recipient
   * @param {string} recipient - Email recipient address
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<MailpitEmail>} Promise that resolves with the email
   * @complexity O(t) where t is timeout duration
   * @throws {Error} If email is not received within timeout
   */
  async waitForEmail(recipient: string, timeout: number = 30000): Promise<MailpitEmail> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.apiUrl}/api/v1/search?query=to:${recipient}&limit=1`);
        
        if (!response.ok) {
          throw new Error(`Mailpit API error: ${response.statusText}`);
        }

        const data = await response.json() as MailpitSearchResponse;
        
        if (data.total > 0 && data.messages.length > 0) {
          // Get full email details
          const emailResponse = await fetch(`${this.apiUrl}/api/v1/message/${data.messages[0].ID}`);
          return await emailResponse.json() as MailpitEmail;
        }
      } catch (error) {
        console.error('Error checking for email:', error);
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Email to ${recipient} not received within ${timeout}ms timeout`);
  }

  /**
   * Gets the latest email for a specific recipient
   * @param {string} recipient - Email recipient address
   * @returns {Promise<MailpitEmail | null>} Promise that resolves with the latest email or null
   * @complexity O(1)
   */
  async getLatestEmail(recipient: string): Promise<MailpitEmail | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/search?query=to:${recipient}&limit=1`);
      
      if (!response.ok) {
        throw new Error(`Mailpit API error: ${response.statusText}`);
      }

      const data = await response.json() as MailpitSearchResponse;
      
      if (data.total > 0 && data.messages.length > 0) {
        const emailResponse = await fetch(`${this.apiUrl}/api/v1/message/${data.messages[0].ID}`);
        return await emailResponse.json() as MailpitEmail;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching latest email:', error);
      return null;
    }
  }

  /**
   * Extracts verification link from an email
   * @param {MailpitEmail} email - Email to extract link from
   * @returns {string | null} Verification link or null if not found
   * @complexity O(n) where n is number of links in email
   */
  extractVerificationLink(email: MailpitEmail): string | null {
    const $ = cheerio.load(email.HTML);
    
    // Look for verification links with common patterns
    const verificationLink = $('a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr('href') || '';
      
      return (
        text.includes('verify') ||
        text.includes('confirm') ||
        text.includes('aktivieren') ||
        text.includes('bestätigen') ||
        href.includes('verify') ||
        href.includes('confirm') ||
        href.includes('token')
      );
    }).first().attr('href');

    return verificationLink || null;
  }

  /**
   * Extracts password reset link from an email
   * @param {MailpitEmail} email - Email to extract link from
   * @returns {string | null} Password reset link or null if not found
   * @complexity O(n) where n is number of links in email
   */
  extractResetPasswordLink(email: MailpitEmail): string | null {
    const $ = cheerio.load(email.HTML);
    
    const resetLink = $('a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      const href = $(el).attr('href') || '';
      
      return (
        text.includes('reset') ||
        text.includes('password') ||
        text.includes('zurücksetzen') ||
        href.includes('reset') ||
        href.includes('password')
      );
    }).first().attr('href');

    return resetLink || null;
  }

  /**
   * Deletes all emails from Mailpit
   * @returns {Promise<void>} Promise that resolves when emails are deleted
   * @complexity O(1)
   */
  async deleteAllEmails(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/api/v1/messages`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting emails:', error);
    }
  }

  /**
   * Gets the total count of emails in Mailpit
   * @returns {Promise<number>} Promise that resolves with email count
   * @complexity O(1)
   */
  async getEmailCount(): Promise<number> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/messages`);
      const data = await response.json() as { total: number };
      return data.total;
    } catch (error) {
      console.error('Error getting email count:', error);
      return 0;
    }
  }
}