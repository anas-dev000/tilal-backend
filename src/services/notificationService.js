import Notification from '../models/Notification.js';
import { emitToUser } from '../config/socket.js';
import {
  sendTaskAssignmentEmail,
  sendTaskCompletionEmail,
  sendLowStockAlert,
  sendInvoiceEmail,
  sendClientCredentials
} from './emailService.js';
import {
  sendTaskAssignmentWhatsApp,
  sendTaskCompletionWhatsApp,
  sendLowStockWhatsApp,
  sendInvoiceWhatsApp,
  sendClientCredentialsWhatsApp
} from './whatsappService.js';
import User from '../models/User.js';

/**
 * Create notification in database and emit via socket
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    
    // Emit real-time notification via Socket.io
    if (notification && notification.recipient) {
      const recipientId = notification.recipient.id || notification.recipient;
      emitToUser(recipientId, 'new_notification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('❌ Create notification error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation details:', Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`));
    }
    return null;
  }
};

/**
 * Send task assignment notification
 */
export const notifyTaskAssignment = async (worker, task, client) => {
  try {
    const safePriority = ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium';

    // 1. Create in-app notification
    const notification = await createNotification({
      recipient: { type: 'User', id: worker._id },
      type: 'task-assigned',
      subject: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      channel: 'both',
      data: { relatedTask: task._id },
      priority: safePriority
    });

    // 2. Send email/WhatsApp in background
    if (notification) {
      sendTaskAssignmentEmail(worker, task, client).catch(e => console.error('Email error:', e));
      sendTaskAssignmentWhatsApp(worker, task, client).catch(e => console.error('WhatsApp error:', e));
    }

    return true;
  } catch (error) {
    console.error('Notify task assignment error:', error);
    return false;
  }
};

/**
 * Send task completion notification
 */
export const notifyTaskCompletion = async (client, task, worker) => {
  try {
    // 1. Notify Client (App + Email)
    createNotification({
      recipient: { type: 'Client', id: client._id },
      type: 'task-completed',
      subject: 'Task Completed',
      message: `Your task "${task.title}" has been completed`,
      channel: 'both',
      data: { relatedTask: task._id },
      priority: 'medium'
    }).then(notif => {
       if (notif) {
         sendTaskCompletionEmail(client, task, worker).catch(e => console.error('Client email error:', e));
       }
    });

    // 2. Notify Admins (App only)
    const admins = await User.find({ role: 'admin', isActive: true });
    admins.forEach(admin => {
      createNotification({
        recipient: { type: 'User', id: admin._id },
        type: 'task-completed',
        subject: 'Task Completed',
        message: `${worker.name} completed task: ${task.title}`,
        channel: 'email', // In-app + Email channel requested by logic
        data: { relatedTask: task._id },
        priority: 'low'
      });
    });

    // 3. Notify Accountants (App only)
    const accountants = await User.find({ role: 'accountant', isActive: true });
    accountants.forEach(accountant => {
      createNotification({
        recipient: { type: 'User', id: accountant._id },
        type: 'task-completed',
        subject: 'Task Ready for Billing',
        message: `Task "${task.title}" for ${client.name} is completed and ready for invoice generation`,
        channel: 'email',
        data: { relatedTask: task._id, clientId: client._id },
        priority: 'medium'
      });
    });

    return true;
  } catch (error) {
    console.error('Notify task completion error:', error);
    return false;
  }
};

/**
 * Send feedback notification
 */
export const notifyFeedback = async (task, feedback, client) => {
  try {
    // 1. Notify Admins
    const admins = await User.find({ role: 'admin', isActive: true });
    admins.forEach(admin => {
      createNotification({
        recipient: { type: 'User', id: admin._id },
        type: 'feedback-received',
        subject: 'New Feedback Received',
        message: `${client.name} provided ${feedback.rating}★ feedback for task: ${task.title}`,
        channel: 'email',
        data: { relatedTask: task._id, rating: feedback.rating },
        priority: feedback.rating <= 2 ? 'high' : 'medium'
      });
    });

    // 2. Notify Worker
    if (task.worker) {
      const workerId = task.worker._id || task.worker;
      createNotification({
        recipient: { type: 'User', id: workerId },
        type: 'feedback-received',
        subject: 'You Received Feedback',
        message: `Client gave you ${feedback.rating}★ for "${task.title}"`,
        channel: 'email',
        data: { relatedTask: task._id, rating: feedback.rating },
        priority: 'medium'
      });
    }

    return true;
  } catch (error) {
    console.error('Notify feedback error:', error);
    return false;
  }
};

/**
 * Notify Accountant about new Site/Client
 */
export const notifyNewSite = async (site, client) => {
  try {
    const accountants = await User.find({ role: 'accountant', isActive: true });
    accountants.forEach(accountant => {
      createNotification({
        recipient: { type: 'User', id: accountant._id },
        type: 'other',
        subject: 'New Site Created',
        message: `New site "${site.name}" created for ${client.name}. Please set up payment cycle.`,
        channel: 'email',
        data: { siteId: site._id, clientId: client._id },
        priority: 'medium'
      });
    });

    return true;
  } catch (error) {
    console.error('Notify new site error:', error);
    return false;
  }
};

/**
 * Send low stock alert to all admins
 */
export const notifyLowStock = async (item) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true });
    
    admins.forEach(admin => {
      createNotification({
        recipient: { type: 'User', id: admin._id },
        type: 'low-stock',
        subject: 'Low Stock Alert',
        message: `${item.name} is running low (${item.quantity.current} ${item.unit} remaining)`,
        channel: 'both',
        priority: 'high'
      }).then(notif => {
        if (notif) {
          sendLowStockAlert(admin.email, item).catch(err => console.error('Email alert error:', err));
          if (admin.phone) {
            sendLowStockWhatsApp(admin.phone, item).catch(err => console.error('WhatsApp alert error:', err));
          }
        }
      });
    });

    return true;
  } catch (error) {
    console.error('Notify low stock error:', error);
    return false;
  }
};

/**
 * Send invoice notification
 */
export const notifyInvoice = async (client, invoice, pdfPath) => {
  try {
    // 1. Create in-app notification
    createNotification({
      recipient: { type: 'Client', id: client._id },
      type: 'invoice-generated',
      subject: 'Invoice Generated',
      message: `Invoice ${invoice.invoiceNumber} has been generated`,
      channel: 'both',
      data: { relatedInvoice: invoice._id },
      priority: 'medium'
    }).then(notif => {
      if (notif) {
        sendInvoiceEmail(client, invoice, pdfPath).catch(e => console.error('Invoice email error:', e));
        sendInvoiceWhatsApp(client, invoice).catch(e => console.error('Invoice WhatsApp error:', e));
      }
    });

    return true;
  } catch (error) {
    console.error('Notify invoice error:', error);
    return false;
  }
};

/**
 * Send client credentials
 */
export const notifyClientCredentials = async (client, username, temporaryPassword) => {
  try {
    // Send email/WhatsApp in background
    sendClientCredentials(client, username, temporaryPassword).catch(e => console.error('Credentials email error:', e));
    sendClientCredentialsWhatsApp(client, username, temporaryPassword).catch(e => console.error('Credentials WhatsApp error:', e));

    return true;
  } catch (error) {
    console.error('Notify client credentials error:', error);
    return false;
  }
};

/**
 * Send payment reminder
 */
export const notifyPaymentReminder = async (client, invoice) => {
  try {
    // Create in-app notification
    await createNotification({
      recipient: { type: 'Client', id: client._id },
      type: 'other', 
      subject: 'Payment Reminder',
      message: `Payment for invoice ${invoice.invoiceNumber} is due`,
      channel: 'both',
      data: { relatedInvoice: invoice._id },
      priority: 'high'
    });

    return true;
  } catch (error) {
    console.error('Notify payment reminder error:', error);
    return false;
  }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      unreadOnly = false,
      limit = 20,
      page = 1
    } = options;

    const query = { 
      'recipient.id': userId,
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } 
    };
    
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const count = await Notification.countDocuments(query);

    return {
      notifications,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    };
  } catch (error) {
    console.error('Get user notifications error:', error);
    return null;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    await Notification.findByIdAndUpdate(notificationId, { 
      read: true, 
      readAt: new Date() 
    });
    return true;
  } catch (error) {
    console.error('Delete on markAsRead error:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { 'recipient.id': userId, read: false },
      { read: true, readAt: new Date() }
    );
    return true;
  } catch (error) {
    console.error('Delete all on markAllAsRead error:', error);
    return false;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId);
    return true;
  } catch (error) {
    console.error('Delete notification error:', error);
    return false;
  }
};

export default {
  notifyTaskAssignment,
  notifyTaskCompletion,
  notifyLowStock,
  notifyInvoice,
  notifyClientCredentials,
  notifyPaymentReminder,
  notifyFeedback,
  notifyNewSite,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
