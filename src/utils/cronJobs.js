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
cron.schedule("0 2 * * *", async () => {
  console.log("Running cron job to check for overdue invoices...");
  try {
    const currentDate = new Date();
    
    // Find pending invoices where dueDate is in the past
    const result = await Invoice.updateMany(
      {
        paymentStatus: "pending",
        dueDate: { $lt: currentDate }
      },
      {
        $set: { paymentStatus: "overdue" }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Marked ${result.modifiedCount} invoices as overdue.`);
    } else {
      console.log("No overdue invoices found.");
    }
  } catch (error) {
    console.error("❌ Error running overdue invoices cron job:", error);
  }
});
