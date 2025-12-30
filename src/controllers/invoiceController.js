import Invoice from '../models/Invoice.js';
import Site from '../models/Site.js';
import Client from '../models/Client.js';
import { notifyInvoice } from '../services/notificationService.js';

/**
 * @desc    Get all invoices with filters
 * @route   GET /api/v1/invoices
 * @access  Private (Admin only)
 */
export const getInvoices = async (req, res) => {
  try {
    const {
      paymentStatus,
      client,
      site,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    // Apply filters
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (client) query.client = client;
    if (site) query.site = site;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('client', 'name email phone')
      .populate('site', 'name location')
      .populate('task', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Invoice.countDocuments(query);

    res.status(200).json({
      success: true,
      count: invoices.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

/**
 * @desc    Get invoice by ID
 * @route   GET /api/v1/invoices/:id
 * @access  Private
 */
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone address')
      .populate('site', 'name location paymentCycle')
      .populate('task', 'title description');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

/**
 * @desc    Create invoice with PDF upload
 * @route   POST /api/v1/invoices
 * @access  Private (Admin only)
 */
export const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;

    // Handle PDF upload from Cloudinary
    if (req.file && req.file.cloudinaryUrl) {
      invoiceData.pdfFile = {
        url: req.file.cloudinaryUrl,
        cloudinaryId: req.file.cloudinaryId,
        uploadedAt: new Date()
      };
      invoiceData.pdfUrl = req.file.cloudinaryUrl;
    }

    // Validate that either site or task is provided
    if (!invoiceData.site && !invoiceData.task) {
      return res.status(400).json({
        success: false,
        message: 'Either site or task is required'
      });
    }

    // If site is provided, get client from site
    if (invoiceData.site && !invoiceData.client) {
      const site = await Site.findById(invoiceData.site);
      if (site) {
        invoiceData.client = site.client;
      }
    }

    const invoice = await Invoice.create(invoiceData);

    // Update site's last payment date if applicable
    if (invoice.site && invoice.paymentStatus === 'paid') {
      await Site.findByIdAndUpdate(invoice.site, {
        lastPaymentDate: new Date()
      });
    }

    // Notify Client
    const client = await Client.findById(invoice.client);
    if (client) {
        await notifyInvoice(client, invoice, invoice.pdfUrl);
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('client', 'name email phone')
      .populate('site', 'name location paymentCycle')
      .populate('task', 'title');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
};

/**
 * @desc    Update invoice
 * @route   PUT /api/v1/invoices/:id
 * @access  Private (Admin only)
 */
export const updateInvoice = async (req, res) => {
  try {
    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const updateData = req.body;

    // Handle new PDF upload
    if (req.file && req.file.cloudinaryUrl) {
      updateData.pdfFile = {
        url: req.file.cloudinaryUrl,
        cloudinaryId: req.file.cloudinaryId,
        uploadedAt: new Date()
      };
      updateData.pdfUrl = req.file.cloudinaryUrl;
    }

    invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('client site task');

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

/**
 * @desc    Delete invoice
 * @route   DELETE /api/v1/invoices/:id
 * @access  Private (Admin only)
 */
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message
    });
  }
};

/**
 * @desc    Get invoice statistics for dashboard
 * @route   GET /api/v1/invoices/stats
 * @access  Private (Admin only)
 */
export const getInvoiceStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Start of current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    
    // Start of current year
    const startOfYear = new Date(currentYear, 0, 1);

    // Monthly stats
    const monthlyInvoices = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    // Yearly stats
    const yearlyInvoices = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] }
          }
        }
      }
    ]);

    // Monthly breakdown for chart (last 12 months)
    const monthlyBreakdown = await Invoice.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthly: monthlyInvoices[0] || {
          totalCount: 0,
          totalAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          pendingCount: 0
        },
        yearly: yearlyInvoices[0] || {
          totalCount: 0,
          totalAmount: 0,
          paidCount: 0,
          paidAmount: 0
        },
        monthlyBreakdown
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get payment alerts (upcoming and overdue)
 * @route   GET /api/v1/invoices/payment-alerts
 * @access  Private (Admin only)
 */
export const getPaymentAlerts = async (req, res) => {
  try {
    const currentDate = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Find all sites with payment cycles
    const sites = await Site.find({
      isActive: true,
      nextPaymentDate: { $exists: true, $ne: null }
    })
      .populate('client', 'name email phone')
      .lean();

    const alerts = {
      overdue: [],
      upcoming: [],
      upToDate: []
    };

    sites.forEach(site => {
      if (!site.nextPaymentDate) return;

      const nextPayment = new Date(site.nextPaymentDate);
      
      if (nextPayment < currentDate) {
        // Overdue
        alerts.overdue.push({
          ...site,
          daysOverdue: Math.floor((currentDate - nextPayment) / (1000 * 60 * 60 * 24))
        });
      } else if (nextPayment <= sevenDaysFromNow) {
        // Due within 7 days
        alerts.upcoming.push({
          ...site,
          daysUntilDue: Math.floor((nextPayment - currentDate) / (1000 * 60 * 60 * 24))
        });
      } else {
        // Up to date
        alerts.upToDate.push(site);
      }
    });

    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get payment alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment alerts',
      error: error.message
    });
  }
};

export default {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getPaymentAlerts
};
