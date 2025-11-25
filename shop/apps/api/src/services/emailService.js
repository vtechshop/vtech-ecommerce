// FILE: apps/api/src/services/emailService.js
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Only initialize if SMTP credentials are provided
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      // Verify connection only in production
      if (env.NODE_ENV === 'production') {
        this.transporter.verify((error) => {
          if (error) {
            logger.error('Email transporter verification failed:', error);
          } else {
            logger.info('Email service ready');
          }
        });
      } else {
        logger.info('Email service configured (verification skipped in development)');
      }
    } else {
      logger.info('Email service not configured - emails will be logged only');
    }
  }

  async sendVerificationEmail(user, token) {
    const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: env.MAIL_FROM,
      to: user.email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background: #FF9F1C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Store!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>Thank you for registering! Please verify your email address to activate your account.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.send(mailOptions);
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: env.MAIL_FROM,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #011627; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background: #FF9F1C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.send(mailOptions);
  }

  async sendAccountLockedEmail(user, lockDuration) {
    const mailOptions = {
      from: env.MAIL_FROM,
      to: user.email,
      subject: 'Account Temporarily Locked - Security Alert',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .alert { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Security Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <div class="alert">
                <strong>Your account has been temporarily locked due to multiple failed login attempts.</strong>
              </div>
              <p>For your security, your account will be automatically unlocked in <strong>${lockDuration} minutes</strong>.</p>
              <p>If this wasn't you, please:</p>
              <ul>
                <li>Wait for the lockout period to expire</li>
                <li>Reset your password immediately</li>
                <li>Contact our support team if you suspect unauthorized access</li>
              </ul>
              <p>Support: ${env.SUPPORT_EMAIL || 'support@yourstore.com'}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return this.send(mailOptions);
  }

  async send(mailOptions) {
    if (!this.transporter) {
      // In development without SMTP, just log the email
      logger.info('Email would be sent (SMTP not configured):', {
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      // Extract verification/reset URL from HTML for development
      const urlMatch = mailOptions.html.match(/href="([^"]+)"/);
      if (urlMatch) {
        logger.info('Action URL:', urlMatch[1]);
      }

      return {
        success: true,
        message: 'Email simulated (SMTP not configured)',
        actionUrl: urlMatch ? urlMatch[1] : null
      };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', {
        to: mailOptions.to,
        messageId: info.messageId,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }
}

module.exports = new EmailService();
