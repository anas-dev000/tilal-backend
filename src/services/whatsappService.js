import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Create Twilio client
const createClient = () => {
  // Check if WhatsApp is enabled
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS !== 'true') {
    console.log('WhatsApp notifications are disabled');
    return null;
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('Twilio credentials not configured');
    return null;
  }

  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
};

/**
 * Send WhatsApp message
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - Message text
 * @returns {Promise<boolean>}
 */
export const sendWhatsAppMessage = async (to, message) => {
  try {
    const client = createClient();
    
    if (!client) {
      console.log('WhatsApp message not sent - notifications disabled or not configured');
      return false;
    }

    // Format phone number (ensure it starts with whatsapp:)
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox number

    await client.messages.create({
      from,
      to: formattedTo,
      body: message
    });

    console.log(`WhatsApp message sent to ${to}`);
    return true;
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return false;
  }
};

/**
 * Send task assignment notification via WhatsApp
 */
export const sendTaskAssignmentWhatsApp = async (worker, task, client) => {
  const message = `
🌿 *New Task Assigned*

Hello ${worker.name},

You have been assigned a new task:

*Task:* ${task.title}
*Client:* ${client.name}
*Category:* ${task.category}
*Priority:* ${task.priority}
*Scheduled Date:* ${new Date(task.scheduledDate).toLocaleDateString()}

Please log in to the system to view more details.

Kingdom Telal Company Team
  `.trim();

  return await sendWhatsAppMessage(worker.phone, message);
};

/**
 * Send task completion notification via WhatsApp
 */
export const sendTaskCompletionWhatsApp = async (client, task, worker) => {
  const message = `
✅ *Task Completed*

Hello ${client.name},

Your task has been completed:

*Task:* ${task.title}
*Worker:* ${worker.name}
*Completed Date:* ${new Date(task.completedAt).toLocaleDateString()}

Please log in to view the results and provide your feedback.

Thank you for choosing our services!

Kingdom Telal Company Team
  `.trim();

  return await sendWhatsAppMessage(client.whatsapp || client.phone, message);
};

/**
 * Send low stock alert via WhatsApp
 */
export const sendLowStockWhatsApp = async (adminPhone, item) => {
  const message = `
⚠️ *Low Stock Alert*

The following inventory item is running low:

*Item:* ${item.name}
*SKU:* ${item.sku}
*Current Quantity:* ${item.quantity.current} ${item.unit}
*Minimum Quantity:* ${item.quantity.minimum} ${item.unit}

Please restock this item as soon as possible.

Kingdom Telal Company
  `.trim();

  return await sendWhatsAppMessage(adminPhone, message);
};

/**
 * Send invoice notification via WhatsApp
 */
export const sendInvoiceWhatsApp = async (client, invoice) => {
  const message = `
📄 *Invoice*

Hello ${client.name},

Your invoice is ready:

*Invoice Number:* ${invoice.invoiceNumber}
*Date:* ${new Date(invoice.issuedDate).toLocaleDateString()}
*Total Amount:* $${invoice.totalAmount}
*Payment Status:* ${invoice.paymentStatus}

Please log in to view and download your invoice.

Thank you for your business!

Kingdom Telal Company Team
  `.trim();

  return await sendWhatsAppMessage(client.whatsapp || client.phone, message);
};

/**
 * Send client credentials via WhatsApp
 */
export const sendClientCredentialsWhatsApp = async (client, username, temporaryPassword) => {
  const message = `
🌿 *Welcome to Kingdom Telal Company*

Hello ${client.name},

Your account has been created. Here are your login credentials:

*Username:* ${username}
*Temporary Password:* ${temporaryPassword}

⚠️ *Important:* Please change your password after your first login.

Login at: ${process.env.FRONTEND_URL}/client/login

Kingdom Telal Company Team
  `.trim();

  return await sendWhatsAppMessage(client.whatsapp || client.phone, message);
};

/**
 * Send reminder notification
 */
export const sendTaskReminderWhatsApp = async (worker, task) => {
  const message = `
⏰ *Task Reminder*

Hello ${worker.name},

Reminder: You have a task scheduled for today:

*Task:* ${task.title}
*Client:* ${task.client?.name || 'N/A'}
*Scheduled Time:* ${new Date(task.scheduledDate).toLocaleTimeString()}

Please make sure you're prepared.

Kingdom Telal Company Team
  `.trim();

  return await sendWhatsAppMessage(worker.phone, message);
};

export default {
  sendWhatsAppMessage,
  sendTaskAssignmentWhatsApp,
  sendTaskCompletionWhatsApp,
  sendLowStockWhatsApp,
  sendInvoiceWhatsApp,
  sendClientCredentialsWhatsApp,
  sendTaskReminderWhatsApp
};

