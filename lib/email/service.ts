import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { EmailTemplates, type SubscriptionEmailData } from './templates';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  enable_email_notifications: boolean;
}

interface EmailData extends SubscriptionEmailData {
  userEmail: string;
}

interface PaymentFailureEmailData {
  userEmail: string;
  userName: string;
  amount: number;
  invoiceUrl?: string | null;
}

interface CancellationEmailData {
  userEmail: string;
  userName: string;
  endDate: Date;
}

interface TrialEndingEmailData {
  userEmail: string;
  userName: string;
  daysRemaining: number;
}

export class EmailService {
  private static async getEmailConfig(): Promise<EmailConfig | null> {
    console.log('📧 EmailService: Initializing Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📧 EmailService: Querying system_settings table...');
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select(
        'smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, smtp_from_name, enable_email_notifications'
      )
      .single();

    if (error) {
      console.error('❌ EmailService: Database error:', error);
      console.error('❌ EmailService: Error code:', error.code);
      console.error('❌ EmailService: Error message:', error.message);
      return null;
    }

    if (error || !settings) {
      console.error('Failed to get email settings:', error);
      return null;
    }

    return settings as EmailConfig;
  }

  private static async createTransporter() {
    const config = await this.getEmailConfig();
    if (!config) {
      throw new Error('Email configuration not available');
    }

    return nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_username,
        pass: config.smtp_password,
      },
    });
  }

  static async sendSubscriptionEmail(data: EmailData): Promise<boolean> {
    try {
      console.log('📧 EmailService: Getting email config...');
      const config = await this.getEmailConfig();
      if (!config) {
        console.error('❌ EmailService: Email configuration not available');
        return false;
      }

      console.log('📧 EmailService: Config retrieved:', {
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_from_email: config.smtp_from_email,
        enable_email_notifications: config.enable_email_notifications,
      });

      // Check if email notifications are enabled
      if (!config.enable_email_notifications) {
        console.log('⚠️ EmailService: Email notifications are disabled');
        return true; // Return true to not fail the webhook
      }

      console.log('📧 EmailService: Creating transporter...');
      const transporter = await this.createTransporter();

      console.log('📧 EmailService: Getting email template...');
      const template = EmailTemplates.getSubscriptionEmail(data);

      const mailOptions = {
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to: data.userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      console.log('📧 EmailService: Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      await transporter.sendMail(mailOptions);
      console.log(
        `✅ EmailService: Subscription email sent successfully to ${data.userEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ EmailService: Failed to send subscription email:',
        error
      );
      return false;
    }
  }

  static async testEmailConfiguration(): Promise<boolean> {
    try {
      const config = await this.getEmailConfig();
      if (!config) {
        return false;
      }

      const transporter = await this.createTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  static async sendTestEmail(
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    try {
      const config = await this.getEmailConfig();
      if (!config) {
        return false;
      }

      const transporter = await this.createTransporter();

      const mailOptions = {
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to: userEmail,
        subject: 'Test Email - Veltex Services',
        html: `
          <h2>Email Configuration Test</h2>
          <p>Hi ${userName},</p>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>If you received this email, your SMTP settings are configured properly!</p>
          <p>Best regards,<br>The Veltex Services Team</p>
        `,
        text: `Hi ${userName},\n\nThis is a test email to verify that your email configuration is working correctly.\n\nIf you received this email, your SMTP settings are configured properly!\n\nBest regards,\nThe Veltex Services Team`,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Failed to send test email:', error);
      return false;
    }
  }

  static async sendPaymentFailureEmail(
    data: PaymentFailureEmailData
  ): Promise<boolean> {
    try {
      console.log('📧 EmailService: Sending payment failure email...');
      const config = await this.getEmailConfig();
      if (!config) {
        console.error('❌ EmailService: Email configuration not available');
        return false;
      }

      if (!config.enable_email_notifications) {
        console.log('⚠️ EmailService: Email notifications are disabled');
        return true;
      }

      const transporter = await this.createTransporter();
      const template = EmailTemplates.getPaymentFailureEmail(data);

      const mailOptions = {
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to: data.userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        `✅ EmailService: Payment failure email sent successfully to ${data.userEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ EmailService: Failed to send payment failure email:',
        error
      );
      return false;
    }
  }

  static async sendCancellationEmail(
    data: CancellationEmailData
  ): Promise<boolean> {
    try {
      console.log('📧 EmailService: Sending cancellation email...');
      const config = await this.getEmailConfig();
      if (!config) {
        console.error('❌ EmailService: Email configuration not available');
        return false;
      }

      if (!config.enable_email_notifications) {
        console.log('⚠️ EmailService: Email notifications are disabled');
        return true;
      }

      const transporter = await this.createTransporter();
      const template = EmailTemplates.getCancellationEmail(data);

      const mailOptions = {
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to: data.userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        `✅ EmailService: Cancellation email sent successfully to ${data.userEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ EmailService: Failed to send cancellation email:',
        error
      );
      return false;
    }
  }

  static async sendTrialEndingEmail(
    data: TrialEndingEmailData
  ): Promise<boolean> {
    try {
      console.log('📧 EmailService: Sending trial ending email...');
      const config = await this.getEmailConfig();
      if (!config) {
        console.error('❌ EmailService: Email configuration not available');
        return false;
      }

      if (!config.enable_email_notifications) {
        console.log('⚠️ EmailService: Email notifications are disabled');
        return true;
      }

      const transporter = await this.createTransporter();
      const template = EmailTemplates.getTrialEndingEmail(data);

      const mailOptions = {
        from: `"${config.smtp_from_name}" <${config.smtp_from_email}>`,
        to: data.userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        `✅ EmailService: Trial ending email sent successfully to ${data.userEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ EmailService: Failed to send trial ending email:',
        error
      );
      return false;
    }
  }
}
