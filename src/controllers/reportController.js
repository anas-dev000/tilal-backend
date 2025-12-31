import Task from '../models/Task.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Inventory from '../models/Inventory.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/reports/dashboard
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get counts
    const [
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      totalClients,
      activeClients,
      totalWorkers,
      activeWorkers,
      totalInvoices,
      paidInvoices,
      pendingInvoices
    ] = await Promise.all([
      Task.countDocuments(dateFilter),
      Task.countDocuments({ ...dateFilter, status: 'completed' }),
      Task.countDocuments({ ...dateFilter, status: 'pending' }),
      Task.countDocuments({ ...dateFilter, status: 'in-progress' }),
      Client.countDocuments(dateFilter),
      Client.countDocuments({ ...dateFilter, status: 'active' }),
      User.countDocuments({ ...dateFilter, role: 'worker' }),
      User.countDocuments({ ...dateFilter, role: 'worker', isActive: true }),
      Invoice.countDocuments(dateFilter),
      Invoice.countDocuments({ ...dateFilter, paymentStatus: 'paid' }),
      Invoice.countDocuments({ ...dateFilter, paymentStatus: 'pending' })
    ]);

    // Get revenue
    const revenueData = await Invoice.aggregate([
      { $match: { paymentStatus: 'paid', ...dateFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, paidAmount: 0 };

    res.status(200).json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
        },
        clients: {
          total: totalClients,
          active: activeClients
        },
        workers: {
          total: totalWorkers,
          active: activeWorkers
        },
        invoices: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices
        },
        revenue: {
          total: revenue.totalRevenue,
          paid: revenue.paidAmount,
          pending: revenue.totalRevenue - revenue.paidAmount
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get weekly report
 * @route   GET /api/v1/reports/weekly
 * @access  Private (Admin)
 */
export const getWeeklyReport = async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dateFilter = {
      createdAt: { $gte: weekAgo, $lte: today }
    };

    // Tasks completed this week
    const completedTasks = await Task.find({
      ...dateFilter,
      status: 'completed'
    })
      .populate('worker', 'name')
      .populate('client', 'name')
      .select('title status completedAt worker client cost')
      .lean();

    // Inventory withdrawals this week
    const inventoryWithdrawals = await InventoryTransaction.find({
      ...dateFilter,
      type: 'withdrawal'
    })
      .populate('inventory', 'name unit')
      .populate('worker', 'name')
      .populate('task', 'title')
      .lean();

    // Worker performance
    const workerPerformance = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: weekAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: '$worker',
          tasksCompleted: { $sum: 1 },
          totalRevenue: { $sum: '$cost.total' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      {
        $unwind: '$worker'
      },
      {
        $project: {
          workerName: '$worker.name',
          tasksCompleted: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: { tasksCompleted: -1 }
      }
    ]);

    // Payment status
    const paymentStatus = await Client.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: {
          start: weekAgo,
          end: today
        },
        completedTasks: {
          count: completedTasks.length,
          tasks: completedTasks
        },
        inventoryWithdrawals: {
          count: inventoryWithdrawals.length,
          withdrawals: inventoryWithdrawals
        },
        workerPerformance,
        paymentStatus
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly report',
      error: error.message
    });
  }
};

/**
 * @desc    Get monthly report
 * @route   GET /api/v1/reports/monthly
 * @access  Private (Admin)
 */
export const getMonthlyReport = async (req, res) => {
  try {
    const today = new Date();
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const dateFilter = {
      createdAt: { $gte: monthAgo, $lte: today }
    };

    // Tasks statistics
    const taskStats = await Task.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Revenue by category
    const revenueByCategory = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: monthAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$cost.total' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    // Top clients
    const topClients = await Task.aggregate([
      {
        $match: {
          completedAt: { $gte: monthAgo, $lte: today }
        }
      },
      {
        $group: {
          _id: '$client',
          tasksCount: { $sum: 1 },
          totalSpent: { $sum: '$cost.total' }
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      },
      {
        $project: {
          clientName: '$client.name',
          clientEmail: '$client.email',
          tasksCount: 1,
          totalSpent: 1
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Inventory status
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity.current', '$quantity.minimum'] }
    })
      .select('name category quantity unit')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        period: {
          start: monthAgo,
          end: today
        },
        taskStats,
        revenueByCategory,
        topClients,
        lowStockItems: {
          count: lowStockItems.length,
          items: lowStockItems
        }
      }
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly report',
      error: error.message
    });
  }
};

/**
 * @desc    Get worker performance report
 * @route   GET /api/v1/reports/workers
 * @access  Private (Admin)
 */
export const getWorkerPerformanceReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'tasksCompleted'
    } = req.query;

    const sortDir = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.replace(/^-/, '');

    const pipeline = [
      {
        $match: {
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$worker',
          tasksCompleted: { $sum: 1 },
          totalRevenue: { $sum: '$cost.total' },
          avgRating: { $avg: '$feedback.rating' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'worker'
        }
      },
      {
        $unwind: '$worker'
      },
      {
        $project: {
          workerName: '$worker.name',
          workerEmail: '$worker.email',
          tasksCompleted: 1,
          totalRevenue: 1,
          avgRating: { $round: ['$avgRating', 2] }
        }
      },
      {
        $sort: { [sortField]: sortDir }
      }
    ];

    // Execution of total count for aggregation is tricky, we'll get it from the full result for now or perform a separate count
    const totalResults = await Task.aggregate([
        { $match: { status: 'completed', ...dateFilter } },
        { $group: { _id: '$worker' } },
        { $count: 'total' }
    ]);
    const total = totalResults[0]?.total || 0;

    const workerPerformance = await Task.aggregate([
        ...pipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit * 1 }
    ]);

    res.status(200).json({
      success: true,
      count: workerPerformance.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: workerPerformance
    });
  } catch (error) {
    console.error('Get worker performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker performance report',
      error: error.message
    });
  }
};

export default {
  getDashboardStats,
  getWeeklyReport,
  getMonthlyReport,
  getWorkerPerformanceReport
};

