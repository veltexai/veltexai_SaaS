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

export interface TrialEndingEmailData {
  userName: string;
  daysRemaining: number;
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
}
