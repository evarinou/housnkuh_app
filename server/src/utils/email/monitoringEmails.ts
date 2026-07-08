/**
 * @file Monitoring alert emails for housnkuh marketplace
 * @description System-Monitoring-Alerts an Administratoren
 * samt MonitoringAlertData-Interface.
 */

import logger from '../logger';
import { getFrontendUrl, createTransporter } from './core';

/**
 * Interface for monitoring alert data structure
 * @interface MonitoringAlertData
 * @description Contains system monitoring alert information for administrators
 */
export interface MonitoringAlertData {
  alertId: string;
  severity: 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  details: any;
}

/**
 * Sends monitoring alerts to administrators
 * @function sendMonitoringAlert
 * @description Notifies administrators about system issues, performance problems,
 * or critical events requiring immediate attention
 * @param {string} to - Administrator email address
 * @param {MonitoringAlertData} alertData - Alert details and context
 * @returns {Promise<boolean>} Promise resolving to true if email sent successfully
 * @complexity O(1)
 * @security Admin-only alerts, includes system diagnostic data
 */
export const sendMonitoringAlert = async (to: string, alertData: MonitoringAlertData): Promise<boolean> => {
  try {
    logger.info(`Sending monitoring alert to: ${to}, severity: ${alertData.severity}`);
    
    // Fake success in development mode if email settings are not available
    if (process.env.NODE_ENV === 'development' && 
        (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      logger.warn('⚠️ Running in development mode without email configuration');
      logger.info('🚨 Would send monitoring alert:', alertData);
      return true; // Return success in development mode
    }
    
    const transporter = createTransporter();
    
    // Determine emoji and colors based on severity
    const severityConfig = {
      warning: { emoji: '⚠️', color: '#f39c12', bgColor: '#fdf2e9' },
      critical: { emoji: '🚨', color: '#e74c3c', bgColor: '#fdedec' },
      emergency: { emoji: '🆘', color: '#8b0000', bgColor: '#ffebee' }
    };
    
    const config = severityConfig[alertData.severity];
    const formattedTime = alertData.timestamp.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const subject = `${config.emoji} housnkuh System Alert: ${alertData.title}`;
    
    const html = `
      <div style="font-family: 'Quicksand', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #09122c; margin: 0;">housnkuh</h1>
            <p style="color: #666; margin: 10px 0;">System Monitoring Alert</p>
          </div>
          
          <div style="background-color: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h2 style="color: ${config.color}; margin: 0 0 10px 0; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">${config.emoji}</span>
              ${alertData.severity.toUpperCase()} ALERT
            </h2>
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">${alertData.title}</h3>
            <p style="color: #333; margin: 0; line-height: 1.6; font-size: 16px;">${alertData.message}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">Alert Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 5px 0; color: #666; width: 100px;"><strong>Alert ID:</strong></td>
                <td style="padding: 5px 0; color: #333; font-family: monospace;">${alertData.alertId}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Severity:</strong></td>
                <td style="padding: 5px 0; color: ${config.color}; text-transform: uppercase;"><strong>${alertData.severity}</strong></td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666;"><strong>Time:</strong></td>
                <td style="padding: 5px 0; color: #333;">${formattedTime}</td>
              </tr>
            </table>
          </div>
          
          ${alertData.details && Object.keys(alertData.details).length > 0 ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #09122c; margin: 0 0 10px 0;">Technical Details</h4>
            <pre style="background-color: white; padding: 10px; border-radius: 3px; font-size: 12px; color: #333; overflow-x: auto; border: 1px solid #ddd;">${JSON.stringify(alertData.details, null, 2)}</pre>
          </div>
          ` : ''}
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #1976d2; margin: 0 0 10px 0;">Recommended Actions</h4>
            <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
              ${alertData.severity === 'critical' || alertData.severity === 'emergency' ? 
                '<li>Immediate investigation required - check system status</li>' : 
                '<li>Monitor the situation and investigate if needed</li>'
              }
              <li>Check the admin dashboard for more details</li>
              <li>Review system logs for additional context</li>
              ${alertData.severity === 'emergency' ? '<li>Consider contacting development team immediately</li>' : ''}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getFrontendUrl()}/admin/dashboard" 
               style="display: inline-block; padding: 12px 30px; background-color: #09122c; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
              View Dashboard
            </a>
            <a href="${getFrontendUrl()}/admin/health" 
               style="display: inline-block; padding: 12px 30px; background-color: ${config.color}; color: white; text-decoration: none; border-radius: 5px;">
              Check System Health
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              © housnkuh - Automatic Monitoring System<br>
              <a href="https://housnkuh.de" style="color: #e17564;">www.housnkuh.de</a>
            </p>
            <p style="color: #999; font-size: 11px; margin: 10px 0 0 0;">
              This is an automated alert from the housnkuh monitoring system.
            </p>
          </div>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"housnkuh Monitoring" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    
    logger.info('Sending monitoring alert:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      severity: alertData.severity
    });
    
    try {
      const result = await transporter.sendMail(mailOptions);
      logger.info('Monitoring alert sent successfully:', result.messageId);
      return true;
    } catch (emailError) {
      logger.error('Monitoring alert email error:', emailError);
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    logger.error('Error in sendMonitoringAlert:', error);
    
    if (process.env.NODE_ENV === 'development') {
      logger.warn('⚠️ In development mode, treating monitoring alert as sent successfully');
      return true;
    }
    
    return false;
  }
};
