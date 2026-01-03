import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  // Check if email is enabled
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
    console.log('Email notifications are disabled');
    return null;
  }

  console.log('DEBUG: Email Config:', {
    host: process.env.EMAIL_HOST,
    user: process.env.EMAIL_USER,
    enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS
  });

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send email
 * @param {object} options - Email options
 * @returns {Promise<boolean>}
 */
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('Email not sent - notifications disabled');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Kingdom Telal Company <noreply@telal.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

/**
 * Send task assignment notification
 */
export const sendTaskAssignmentEmail = async (worker, task, client) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">New Task Assigned</h2>
      <p>Hello ${worker.name},</p>
      <p>You have been assigned a new task:</p>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${task.title}</h3>
        <p><strong>Client:</strong> ${client.name}</p>
        <p><strong>Description:</strong> ${task.description}</p>
        <p><strong>Category:</strong> ${task.category}</p>
        <p><strong>Priority:</strong> ${task.priority}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(task.scheduledDate).toLocaleDateString()}</p>
      </div>
      
      <p>Please log in to the system to view more details and start the task.</p>
      
      <p>Best regards,<br>Kingdom Telal Company Team</p>
    </div>
  `;

  return await sendEmail({
    to: worker.email,
    subject: `New Task Assigned: ${task.title}`,
    html
  });
};

/**
 * Send task completion notification
 */
export const sendTaskCompletionEmail = async (client, task, worker) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Task Completed</h2>
      <p>Hello ${client.name},</p>
      <p>Your task has been completed:</p>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${task.title}</h3>
        <p><strong>Worker:</strong> ${worker.name}</p>
        <p><strong>Completed Date:</strong> ${new Date(task.completedAt).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${task.status}</p>
      </div>
      
      <p>Please log in to view the results and provide your feedback.</p>
      
      <p>Thank you for choosing our services!</p>
      <p>Best regards,<br>Kingdom Telal Company Team</p>
    </div>
  `;

  return await sendEmail({
    to: client.email,
    subject: `Task Completed: ${task.title}`,
    html
  });
};

/**
 * Send low stock alert
 */
export const sendLowStockAlert = async (adminEmail, item) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e53e3e;">⚠️ Low Stock Alert</h2>
      <p>The following inventory item is running low:</p>
      
      <div style="background-color: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
        <h3 style="margin-top: 0; color: #e53e3e;">${item.name}</h3>
        <p><strong>SKU:</strong> ${item.sku}</p>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Current Quantity:</strong> ${item.quantity.current} ${item.unit}</p>
        <p><strong>Minimum Quantity:</strong> ${item.quantity.minimum} ${item.unit}</p>
      </div>
      
      <p>Please restock this item as soon as possible.</p>
      
      <p>Best regards,<br>Kingdom Telal Company</p>
    </div>
  `;

  return await sendEmail({
    to: adminEmail,
    subject: `⚠️ Low Stock Alert: ${item.name}`,
    html
  });
};

/**
 * Send invoice email
 */
export const sendInvoiceEmail = async (client, invoice, pdfPath) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Invoice</h2>
      <p>Hello ${client.name},</p>
      <p>Please find attached your invoice:</p>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Date:</strong> ${new Date(invoice.issuedDate).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${invoice.totalAmount}</p>
        <p><strong>Payment Status:</strong> ${invoice.paymentStatus}</p>
      </div>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Thank you for your business!</p>
      <p>Best regards,<br>Kingdom Telal Company Team</p>
    </div>
  `;

  const attachments = [];
  if (pdfPath) {
    attachments.push({
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
      path: pdfPath
    });
  }

  return await sendEmail({
    to: client.email,
    subject: `Invoice ${invoice.invoiceNumber}`,
    html,
    attachments
  });
};

/**
 * Send client credentials
 */
// Send client credentials
export const sendClientCredentials = async (client, username, temporaryPassword) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Welcome to Kingdom Telal Company</h2>
      <p>Hello ${client.name},</p>
      <p>Your account has been created. Here are your login credentials:</p>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      </div>
      
      <p style="color: #e53e3e;"><strong>Important:</strong> Please change your password after your first login.</p>
      
      <p>You can log in at: ${process.env.FRONTEND_URL}/client/login</p>
      
      <p>Best regards,<br>Kingdom Telal Company Team</p>
    </div>
  `;

  return await sendEmail({
    to: client.email,
    subject: 'Your Kingdom Telal Account Credentials',
    html
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2d3748;">Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>

      <p>If the button doesn't work, verify this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      
      <p>Best regards,<br>Kingdom Telal Company Team</p>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
};

export default {
  sendEmail,
  sendTaskAssignmentEmail,
  sendTaskCompletionEmail,
  sendLowStockAlert,
  sendInvoiceEmail,
  sendClientCredentials,
  sendPasswordResetEmail
};

