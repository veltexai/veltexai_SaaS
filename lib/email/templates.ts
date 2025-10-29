export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SubscriptionEmailData {
  userName: string;
  planName: string;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  isNewSubscription?: boolean;
  previousPlan?: string;
}

export interface PaymentFailureEmailData {
  userName: string;
  amount: number;
  invoiceUrl?: string | null;
}

export interface CancellationEmailData {
  userName: string;
  endDate: Date;
}

export interface EnhancedCancellationEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  endDate: Date;
  cancellationReason?: string;
  customReason?: string;
  reactivationUrl: string;
}

export interface ReactivationEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  nextBillingDate: Date;
}

export interface GracePeriodEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  daysRemaining: number;
  expirationDate: Date;
  reactivationUrl: string;
}

export interface TrialEndingEmailData {
  userName: string;
  daysRemaining: number;
}

export interface ProposalEmailData {
  clientName: string;
  proposalTitle: string;
  companyName: string;
  senderName: string;
  proposalViewUrl?: string;
  hasAttachment?: boolean;
}

export interface ProposalEmailData {
  clientName: string;
  clientEmail: string;
  proposalTitle: string;
  companyName: string;
  senderName: string;
  proposalViewUrl?: string;
  hasAttachment?: boolean;
}

export interface EnhancedProposalEmailData {
  clientName: string;
  clientEmail: string;
  ccEmails?: string[];
  subject: string;
  message: string;
  proposalTitle: string;
  companyName: string;
  senderName: string;
  senderEmail: string;
  proposalViewUrl?: string;
  hasAttachment?: boolean;
  sendCopyToSelf?: boolean;
  trackingId: string;
  brandingEnabled?: boolean;
  primaryColor?: string;
  logoUrl?: string;
}

export class EmailTemplates {
  static getSubscriptionEmail(data: SubscriptionEmailData): EmailTemplate {
    if (data.isNewSubscription) {
      return this.getWelcomeTemplate(data);
    } else if (data.isUpgrade) {
      return this.getUpgradeTemplate(data);
    } else if (data.isDowngrade) {
      return this.getDowngradeTemplate(data);
    } else {
      return this.getUpdateTemplate(data);
    }
  }

  private static getWelcomeTemplate(
    data: SubscriptionEmailData
  ): EmailTemplate {
    const subject = `Welcome to ${data.planName} Plan - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nWelcome to Veltex Services! Your ${data.planName} subscription is now active.\n\nThank you for choosing us!\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ${data.planName}!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Veltex Services!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>Welcome to Veltex Services! Your subscription is now active and ready to use.</p>
            <div class="plan-badge">${data.planName} Plan</div>
            <p>You now have access to all the features included in your plan. Start creating professional proposals today!</p>
            <a href="#" class="cta-button">Get Started</a>
            <p>If you have any questions, our support team is here to help.</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing Veltex Services!<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  private static getUpgradeTemplate(
    data: SubscriptionEmailData
  ): EmailTemplate {
    const subject = `Plan Upgraded to ${data.planName} - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nGreat news! Your plan has been upgraded from ${data.previousPlan} to ${data.planName}.\n\nYou now have access to additional features and benefits.\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan Upgraded!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .upgrade-box { background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 4px; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Plan Upgraded!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="upgrade-box">
              <strong>Congratulations!</strong> Your plan has been upgraded.
            </div>
            <p>Your plan has been upgraded from <strong>${data.previousPlan}</strong> to:</p>
            <div class="plan-badge">${data.planName} Plan</div>
            <p>You now have access to additional features and benefits. Explore your new capabilities!</p>
            <a href="#" class="cta-button">Explore New Features</a>
            <p>Thank you for growing with us!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  private static getDowngradeTemplate(
    data: SubscriptionEmailData
  ): EmailTemplate {
    const subject = `Plan Changed to ${data.planName} - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nYour plan has been changed from ${data.previousPlan} to ${data.planName}.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-badge { background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .info-box { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; border-radius: 4px; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Plan Updated</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="info-box">
              Your plan has been updated as requested.
            </div>
            <p>Your plan has been changed from <strong>${data.previousPlan}</strong> to:</p>
            <div class="plan-badge">${data.planName} Plan</div>
            <p>Your new plan features are now active. If you need to upgrade again in the future, you can do so anytime from your account.</p>
            <a href="#" class="cta-button">Manage Subscription</a>
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  private static getUpdateTemplate(data: SubscriptionEmailData): EmailTemplate {
    const subject = `Subscription Updated - ${data.planName} - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nThis is a confirmation that your ${data.planName} subscription has been updated.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Updated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-badge { background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Updated</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>This is a confirmation that your subscription has been updated.</p>
            <div class="plan-badge">${data.planName} Plan</div>
            <p>Your subscription details have been successfully updated and are now active.</p>
            <a href="#" class="cta-button">View Account</a>
            <p>If you have any questions about your subscription, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getPaymentFailureEmail(data: PaymentFailureEmailData): EmailTemplate {
    const subject = 'Payment Failed - Action Required - Veltex Services';
    const text = `Hi ${
      data.userName
    }!\n\nWe were unable to process your payment of $${data.amount.toFixed(
      2
    )}.\n\nPlease update your payment method to continue your subscription.\n\n${
      data.invoiceUrl ? `View invoice: ${data.invoiceUrl}\n\n` : ''
    }Best regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .alert-box { background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0; border-radius: 4px; }
          .amount { background: #f44336; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .cta-button { background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Failed</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="alert-box">
              <strong>Action Required:</strong> We were unable to process your payment.
            </div>
            <p>We attempted to charge your payment method for:</p>
            <div class="amount">$${data.amount.toFixed(2)}</div>
            <p>To continue your subscription without interruption, please update your payment method as soon as possible.</p>
            ${
              data.invoiceUrl
                ? `<a href="${data.invoiceUrl}" class="cta-button">View Invoice & Update Payment</a>`
                : '<a href="#" class="cta-button">Update Payment Method</a>'
            }
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getCancellationEmail(data: CancellationEmailData): EmailTemplate {
    const subject = 'Subscription Canceled - Veltex Services';
    const endDateStr = data.endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const text = `Hi ${data.userName}!\n\nYour subscription has been canceled as requested.\n\nYou will continue to have access to your account until ${endDateStr}.\n\nWe're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Canceled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; border-radius: 4px; }
          .date-badge { background: #ff9800; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .cta-button { background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Canceled</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>Your subscription has been canceled as requested.</p>
            <div class="info-box">
              <strong>Access continues until:</strong>
              <div class="date-badge">${endDateStr}</div>
            </div>
            <p>You will continue to have full access to your account and all features until your current billing period ends.</p>
            <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime before it expires.</p>
            <a href="#" class="cta-button">Reactivate Subscription</a>
            <p>Thank you for being part of the Veltex Services community.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getEnhancedCancellationEmail(data: EnhancedCancellationEmailData): EmailTemplate {
    const subject = `${data.planName} Subscription Canceled - Veltex Services`;
    const endDateStr = data.endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const reasonText = data.cancellationReason 
      ? (data.cancellationReason === 'other' && data.customReason 
          ? data.customReason 
          : data.cancellationReason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      : 'Not specified';

    const text = `Hi ${data.userName}!\n\nYour ${data.planName} subscription has been canceled as requested.\n\nCancellation reason: ${reasonText}\n\nYou will continue to have access to your account until ${endDateStr}.\n\nWe're sorry to see you go! If you change your mind, you can reactivate your subscription anytime.\n\nReactivate: ${data.reactivationUrl}\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.planName} Subscription Canceled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; border-radius: 4px; }
          .reason-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .date-badge { background: #ff9800; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .cta-button { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.planName} Subscription Canceled</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>Your <strong>${data.planName}</strong> subscription has been canceled as requested.</p>
            
            ${data.cancellationReason ? `
            <div class="reason-box">
              <strong>Cancellation reason:</strong> ${reasonText}
            </div>
            ` : ''}
            
            <div class="info-box">
              <strong>Your access continues until:</strong>
              <div class="date-badge">${endDateStr}</div>
            </div>
            
            <p>You will continue to have full access to your account and all features until your current billing period ends.</p>
            <p>We're sorry to see you go! Your feedback helps us improve our service.</p>
            <p>If you change your mind, you can easily reactivate your subscription anytime before it expires:</p>
            
            <div style="text-align: center;">
              <a href="${data.reactivationUrl}" class="cta-button">Reactivate Subscription</a>
            </div>
            
            <p>Thank you for being part of the Veltex Services community.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
            <p><small>If you have any questions, please contact our support team.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getReactivationEmail(data: ReactivationEmailData): EmailTemplate {
    const subject = `Welcome Back! ${data.planName} Subscription Reactivated - Veltex Services`;
    const nextBillingStr = data.nextBillingDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const text = `Hi ${data.userName}!\n\nGreat news! Your ${data.planName} subscription has been successfully reactivated.\n\nYour next billing date: ${nextBillingStr}\n\nYou now have full access to all features again.\n\nWelcome back!\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome Back! Subscription Reactivated</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 4px; }
          .date-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Back!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="success-box">
              <strong>Great news!</strong> Your <strong>${data.planName}</strong> subscription has been successfully reactivated.
            </div>
            <p>You now have full access to all features again, including:</p>
            <ul>
              <li>Unlimited proposal generation</li>
              <li>AI-powered content creation</li>
              <li>Professional PDF exports</li>
              <li>Client management tools</li>
            </ul>
            <p><strong>Next billing date:</strong></p>
            <div class="date-badge">${nextBillingStr}</div>
            <p>We're thrilled to have you back as part of the Veltex Services community!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getGracePeriodEmail(data: GracePeriodEmailData): EmailTemplate {
    const subject = `${data.daysRemaining} Days Left - Reactivate Your ${data.planName} Subscription`;
    const expirationStr = data.expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const text = `Hi ${data.userName}!\n\nYour ${data.planName} subscription expires in ${data.daysRemaining} days (${expirationStr}).\n\nDon't lose access to your proposals and data!\n\nReactivate now: ${data.reactivationUrl}\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Expiring Soon</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff5722 0%, #d84315 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; border-radius: 4px; }
          .countdown-badge { background: #ff5722; color: white; padding: 12px 20px; border-radius: 25px; display: inline-block; margin: 15px 0; font-weight: bold; font-size: 18px; }
          .cta-button { background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="warning-box">
              <strong>Important:</strong> Your <strong>${data.planName}</strong> subscription expires soon!
            </div>
            
            <div style="text-align: center;">
              <div class="countdown-badge">${data.daysRemaining} Days Left</div>
              <p><strong>Expires on:</strong> ${expirationStr}</p>
            </div>
            
            <p>Don't lose access to:</p>
            <ul>
              <li>Your saved proposals and templates</li>
              <li>Client management data</li>
              <li>AI-powered proposal generation</li>
              <li>Professional features and tools</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${data.reactivationUrl}" class="cta-button">Reactivate Now</a>
            </div>
            
            <p><small>Reactivating is quick and easy - your account will be restored immediately with all your data intact.</small></p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
            <p><small>Questions? Contact our support team anytime.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getTrialEndingEmail(data: TrialEndingEmailData): EmailTemplate {
    const subject = `Your Trial Ends in ${data.daysRemaining} Days - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nYour free trial ends in ${data.daysRemaining} days.\n\nTo continue using Veltex Services without interruption, please choose a subscription plan.\n\nDon't lose access to your proposals and data!\n\nBest regards,\nThe Veltex Services Team`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Trial Ending Soon</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; }
          .days-badge { background: #ffc107; color: #212529; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; font-size: 18px; }
          .cta-button { background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Trial Ending Soon</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <div class="warning-box">
              <strong>Your free trial ends in:</strong>
              <div class="days-badge">${data.daysRemaining} ${
      data.daysRemaining === 1 ? 'Day' : 'Days'
    }</div>
            </div>
            <p>We hope you've enjoyed exploring Veltex Services during your trial period!</p>
            <p>To continue creating professional proposals and accessing all features without interruption, please choose a subscription plan that fits your needs.</p>
            <a href="#" class="cta-button">Choose Your Plan</a>
            <p><strong>Don't lose access to:</strong></p>
            <ul>
              <li>Your saved proposals</li>
              <li>Custom templates</li>
              <li>Client data</li>
              <li>All premium features</li>
            </ul>
            <p>Questions? Our support team is here to help!</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getProposalEmail(data: ProposalEmailData): EmailTemplate {
    const subject = `Proposal: ${data.proposalTitle} - ${data.companyName}`;
    const text = `Dear ${data.clientName},\n\nI hope this email finds you well.\n\nI'm pleased to share our proposal for "${data.proposalTitle}" with you. We've carefully reviewed your requirements and prepared a comprehensive solution tailored to your needs.\n\n${data.proposalViewUrl ? `You can view the full proposal online at: ${data.proposalViewUrl}` : 'Please find the proposal attached to this email.'}\n\nWe're excited about the opportunity to work with you and would be happy to discuss any questions you may have about our proposal.\n\nThank you for considering ${data.companyName} for your project. We look forward to hearing from you soon.\n\nBest regards,\n${data.senderName}\n${data.companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Proposal: ${data.proposalTitle}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header .company { font-size: 16px; opacity: 0.9; margin-top: 8px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: #1e3a8a; }
          .proposal-title { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
          .proposal-title h2 { margin: 0; color: #1e3a8a; font-size: 20px; }
          .cta-section { background: #f8fafc; padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center; }
          .cta-button { background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; margin: 10px 0; }
          .cta-button:hover { background: #2563eb; }
          .attachment-notice { background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .attachment-notice .icon { color: #059669; font-size: 18px; }
          .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .signature .name { font-weight: 600; color: #1e3a8a; }
          .signature .company { color: #6b7280; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Proposal Submission</h1>
            <div class="company">${data.companyName}</div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${data.clientName},</div>
            
            <p>I hope this email finds you well.</p>
            
            <p>I'm pleased to share our proposal with you. We've carefully reviewed your requirements and prepared a comprehensive solution tailored to your specific needs.</p>
            
            <div class="proposal-title">
              <h2>${data.proposalTitle}</h2>
            </div>
            
            ${data.proposalViewUrl ? `
              <div class="cta-section">
                <p><strong>View your proposal online:</strong></p>
                <a href="${data.proposalViewUrl}" class="cta-button">View Proposal</a>
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                  Click the button above to access your personalized proposal portal
                </p>
              </div>
            ` : ''}
            
            ${data.hasAttachment ? `
              <div class="attachment-notice">
                <span class="icon">📎</span>
                <strong>Proposal Document Attached</strong>
                <p style="margin: 8px 0 0 0; font-size: 14px;">Please find the detailed proposal document attached to this email.</p>
              </div>
            ` : ''}
            
            <p>We're excited about the opportunity to work with you and would be happy to discuss any questions you may have about our proposal. Our team is ready to provide any additional information or clarification you might need.</p>
            
            <p>Thank you for considering <strong>${data.companyName}</strong> for your project. We look forward to hearing from you soon and hope to begin this exciting partnership.</p>
            
            <div class="signature">
              <div class="name">${data.senderName}</div>
              <div class="company">${data.companyName}</div>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This proposal was generated using Veltex Services
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  static getEnhancedProposalEmail(data: EnhancedProposalEmailData): EmailTemplate {
    const subject = data.subject;
    const primaryColor = data.brandingEnabled && data.primaryColor ? data.primaryColor : '#3b82f6';
    
    const text = `Dear ${data.clientName},\n\n${data.message}\n\n${data.proposalViewUrl ? `You can view the full proposal online at: ${data.proposalViewUrl}` : 'Please find the proposal attached to this email.'}\n\nBest regards,\n${data.senderName}\n${data.companyName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.subject}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
          .header .company { font-size: 16px; opacity: 0.9; margin-top: 8px; }
          .logo { max-height: 60px; margin-bottom: 20px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: ${primaryColor}; }
          .message { background: #f8fafc; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid ${primaryColor}; }
          .proposal-title { background: #f8fafc; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
          .proposal-title h2 { margin: 0; color: ${primaryColor}; font-size: 20px; }
          .cta-section { background: #f8fafc; padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center; }
          .cta-button { background: ${primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; margin: 10px 0; }
          .cta-button:hover { opacity: 0.9; }
          .attachment-notice { background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .attachment-notice .icon { color: #059669; font-size: 18px; }
          .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .signature .name { font-weight: 600; color: ${primaryColor}; }
          .signature .company { color: #6b7280; margin-top: 5px; }
          .tracking-pixel { width: 1px; height: 1px; }
          .veltex-attribution { font-size: 12px; color: #9ca3af; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${data.brandingEnabled && data.logoUrl ? `<img src="${data.logoUrl}" alt="${data.companyName}" class="logo" />` : ''}
            <h1>📋 ${data.proposalTitle}</h1>
            <div class="company">${data.companyName}</div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${data.clientName},</div>
            
            <div class="message">
              ${data.message.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
            
            <div class="proposal-title">
              <h2>${data.proposalTitle}</h2>
            </div>
            
            ${data.proposalViewUrl ? `
              <div class="cta-section">
                <p><strong>View your proposal online:</strong></p>
                <a href="${data.proposalViewUrl}?tracking=${data.trackingId}" class="cta-button">View Proposal</a>
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                  Click the button above to access your personalized proposal portal
                </p>
              </div>
            ` : ''}
            
            ${data.hasAttachment ? `
              <div class="attachment-notice">
                <span class="icon">📎</span>
                <strong>Proposal Document Attached</strong>
                <p style="margin: 8px 0 0 0; font-size: 14px;">Please find the detailed proposal document attached to this email.</p>
              </div>
            ` : ''}
            
            <div class="signature">
              <div class="name">${data.senderName}</div>
              <div class="company">${data.companyName}</div>
            </div>
          </div>
          <div class="footer">
            <div class="veltex-attribution">
              Powered by Veltex AI - Professional Proposal Generation
            </div>
          </div>
        </div>
        
        <!-- Tracking pixel for email opens -->
        <img src="${process.env.NEXT_PUBLIC_APP_URL}/api/tracking/email-open/${data.trackingId}" alt="" class="tracking-pixel" />
      </body>
      </html>
    `;

    return { subject, html, text };
  }
}
