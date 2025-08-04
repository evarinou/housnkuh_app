// Test email configuration and sending
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testEmailConfig() {
  console.log('📧 Testing Email Configuration\n');
  console.log('Environment variables:');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
  console.log('\n');

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    debug: true,
    logger: true
  });

  try {
    // Verify connection
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('📬 Sending test email...');
    const info = await transporter.sendMail({
      from: `"housnkuh Test" <${process.env.EMAIL_FROM}>`,
      to: 'test-vendor-playwright-2025-07-09@example.com',
      subject: 'Test Email from housnkuh',
      text: 'This is a test email to verify email configuration.',
      html: '<h1>Test Email</h1><p>This is a test email to verify email configuration.</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    // Check Mailpit
    console.log('\n📮 Checking Mailpit...');
    const mailpitResponse = await fetch('http://localhost:8025/api/v1/messages');
    if (mailpitResponse.ok) {
      const data = await mailpitResponse.json();
      console.log(`Total emails in Mailpit: ${data.total}`);
      
      if (data.messages && data.messages.length > 0) {
        console.log('\nRecent emails:');
        data.messages.slice(0, 3).forEach((msg, i) => {
          console.log(`${i + 1}. To: ${msg.To ? msg.To.map(t => t.Address).join(', ') : 'N/A'}`);
          console.log(`   Subject: ${msg.Subject || 'N/A'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testEmailConfig().catch(console.error);