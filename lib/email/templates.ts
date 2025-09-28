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

  private static getWelcomeTemplate(data: SubscriptionEmailData): EmailTemplate {
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
            <p>Thank you for subscribing to our ${data.planName} plan</p>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            <p>We're excited to have you on board! Your <span class="plan-badge">${data.planName}</span> subscription is now active and ready to use.</p>
            
            <p>You can now access all the features of your plan and start creating professional cleaning service proposals.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.veltexservices.com'}/dashboard" class="cta-button">Go to Dashboard</a>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Veltex Services. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  private static getUpgradeTemplate(data: SubscriptionEmailData): EmailTemplate {
    const subject = `Plan Upgraded to ${data.planName} - Veltex Services`;
    const text = `Hi ${data.userName}!\n\nCongratulations! You've successfully upgraded from ${data.previousPlan} to ${data.planName}.\n\nYour new plan features are now available.\n\nBest regards,\nThe Veltex Services Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan Upgraded!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .plan-badge { background: #4CAF50; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          .upgrade-highlight { background: #e8f5e8; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 4px; }
          .cta-button { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Plan Upgraded!</h1>
            <p>You've successfully upgraded to ${data.planName}</p>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            
            <div class="upgrade-highlight">
              <h3>🎉 Congratulations on your upgrade!</h3>
              <p>You've upgraded from <strong>${data.previousPlan}</strong> to <span class="plan-badge">${data.planName}</span></p>
            </div>

            <p>Your new plan features are now available and ready to use. Thank you for growing with us!</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.veltexservices.com'}/dashboard" class="cta-button">Explore New Features</a>
            
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Veltex Services. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }

  private static getDowngradeTemplate(data: SubscriptionEmailData): EmailTemplate {
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
            <p>Your subscription has been changed to ${data.planName}</p>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            
            <div class="info-box">
              <p>Your plan has been changed from <strong>${data.previousPlan}</strong> to <span class="plan-badge">${data.planName}</span></p>
            </div>

            <p>If you have any questions about your plan change or need assistance, please don't hesitate to contact our support team.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.veltexservices.com'}/dashboard" class="cta-button">Go to Dashboard</a>
            
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Veltex Services. All rights reserved.</p>
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
            <p>Your ${data.planName} subscription has been updated</p>
          </div>
          <div class="content">
            <h2>Hi ${data.userName}!</h2>
            
            <p>This is a confirmation that your <span class="plan-badge">${data.planName}</span> subscription has been updated.</p>
            
            <p>If you have any questions or concerns about this update, please contact our support team.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.veltexservices.com'}/dashboard" class="cta-button">Go to Dashboard</a>
            
            <p>Best regards,<br>The Veltex Services Team</p>
          </div>
          <div class="footer">
            <p>© 2024 Veltex Services. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html, text };
  }
}