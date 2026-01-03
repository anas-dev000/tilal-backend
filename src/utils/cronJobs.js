import cron from "node-cron";
import {
  deleteOldTaskMedia,
  deleteOldTasks,
} from "../controllers/taskController.js";
// Schedule daily at midnight for deleting old task media
cron.schedule("0 0 * * *", async () => {
  console.log("Running cron job to delete old task media");
  await deleteOldTaskMedia();
});
// Schedule daily at 1 AM for deleting old tasks
cron.schedule("0 1 * * *", async () => {
  console.log("Running cron job to delete old tasks");
  await deleteOldTasks();
});

// ✅ Schedule daily at 2 AM to check for overdue invoices
import Invoice from "../models/Invoice.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "../config/socket.js";

cron.schedule("0 2 * * *", async () => {
  console.log("Running cron job to check for overdue invoices...");
  try {
    const currentDate = new Date();
    // Set to start of today (00:00:00) to ensure we only mark yesterday's (or older) invoices as overdue
    const checkDate = new Date(currentDate);
    checkDate.setHours(0, 0, 0, 0);
    
    // Find pending invoices where dueDate is strictly less than checkDate
    const overdueInvoices = await Invoice.find({
      paymentStatus: "pending",
      dueDate: { $lt: checkDate }
    }).populate("client", "name"); // Populate client name for the message

    if (overdueInvoices.length > 0) {
      console.log(`Found ${overdueInvoices.length} overdue invoices. Updating status and notifying...`);
      
      // Get Admins and Accountants to notify
      const admins = await User.find({ role: "admin", isActive: true });
      const accountants = await User.find({ role: "accountant", isActive: true });
      const recipients = [...admins, ...accountants];

      for (const invoice of overdueInvoices) {
        // Update status to overdue
        invoice.paymentStatus = "overdue";
        await invoice.save();

        // Notify Admins and Accountants
        for (const user of recipients) {
          try {
             const notificationData = {
              recipient: { type: "User", id: user._id },
              type: "invoice-overdue", // Custom type or general 'other'
              subject: "Invoice Overdue",
              message: `Invoice ${invoice.invoiceNumber} for client ${invoice.client?.name || "Unknown"} is now OVERDUE.`,
              channel: "both", // In-app + others if configured
              data: { relatedInvoice: invoice._id, clientId: invoice.client?._id },
              priority: "high"
            };
            
            const notification = await Notification.create(notificationData);
            if (notification) {
               emitToUser(user._id, "new_notification", notification);
            }
          } catch (notifError) {
             console.error(`Failed to notify user ${user._id} for invoice ${invoice._id}:`, notifError);
          }
        }
      }
      console.log(`✅ Marked ${overdueInvoices.length} invoices as overdue and sent notifications.`);
    } else {
      console.log("No overdue invoices found.");
    }
  } catch (error) {
    console.error("❌ Error running overdue invoices cron job:", error);
  }
});
