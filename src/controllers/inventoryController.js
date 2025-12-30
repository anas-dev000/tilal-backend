// backend/src/controllers/inventoryController.js - ✅ SIMPLIFIED
import Inventory from '../models/Inventory.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import User from '../models/User.js';
import { notifyLowStock } from '../services/notificationService.js';

/**
 * @desc    Get all inventory items
 * @route   GET /api/v1/inventory
 * @access  Private
 */
export const getInventoryItems = async (req, res) => {
  try {
    const {
      branch,
      stockStatus,
      search,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (branch) {
      query.branch = branch;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let items = await Inventory.find(query)
      .populate('branch', 'name address')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Filter by stock status if provided
    if (stockStatus) {
      items = items.filter(item => {
        const current = item.quantity.current;
        const minimum = item.quantity.minimum;

        if (stockStatus === 'out-of-stock') return current === 0;
        if (stockStatus === 'low-stock') return current > 0 && current <= minimum;
        if (stockStatus === 'in-stock') return current > minimum;
        return true;
      });
    }

    const count = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: items
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message
    });
  }
};

/**
 * @desc    Get single inventory item
 * @route   GET /api/v1/inventory/:id
 * @access  Private
 */
export const getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('branch', 'name address phone');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
};

/**
 * @desc    Create inventory item
 * @route   POST /api/v1/inventory
 * @access  Private (Admin only)
 */
export const createInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: item
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inventory item',
      error: error.message
    });
  }
};

/**
 * @desc    Update inventory item
 * @route   PUT /api/v1/inventory/:id
 * @access  Private (Admin only)
 */
export const updateInventoryItem = async (req, res) => {
  try {
    let item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully',
      data: item
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory item',
      error: error.message
    });
  }
};

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/v1/inventory/:id
 * @access  Private (Admin only)
 */
export const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Delete inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
};

/**
 * @desc    Withdraw inventory (for task)
 * @route   POST /api/v1/inventory/:id/withdraw
 * @access  Private (Worker or Admin)
 */
export const withdrawInventory = async (req, res) => {
  try {
    const { quantity, taskId, notes } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (item.quantity.current < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    const previousQuantity = item.quantity.current;

    // Deduct quantity
    await item.deduct(quantity);

    // Create transaction record
    await InventoryTransaction.create({
      inventory: item._id,
      task: taskId || null,
      worker: req.user.id,
      type: 'withdrawal',
      quantity,
      unit: item.unit,
      previousQuantity,
      newQuantity: item.quantity.current,
      notes,
      confirmedBy: req.user.id,
      confirmedAt: new Date()
    });

    // Check if low stock alert should be sent
    if (item.quantity.current <= item.quantity.minimum && item.lowStockAlert.enabled) {
      const now = new Date();
      const lastAlert = item.lowStockAlert.lastAlertSent;

      // Send alert only once per day
      if (!lastAlert || (now - lastAlert) > 24 * 60 * 60 * 1000) {
        await notifyLowStock(item);
        item.lowStockAlert.lastAlertSent = now;
        await item.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Inventory withdrawn successfully',
      data: item
    });
  } catch (error) {
    console.error('Withdraw inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw inventory',
      error: error.message
    });
  }
};

/**
 * @desc    Restock inventory
 * @route   POST /api/v1/inventory/:id/restock
 * @access  Private (Admin only)
 */
export const restockInventory = async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    const previousQuantity = item.quantity.current;

    // Add quantity
    await item.restock(quantity);

    // Create transaction record
    await InventoryTransaction.create({
      inventory: item._id,
      worker: req.user.id,
      type: 'restock',
      quantity,
      unit: item.unit,
      previousQuantity,
      newQuantity: item.quantity.current,
      notes,
      confirmedBy: req.user.id,
      confirmedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Inventory restocked successfully',
      data: item
    });
  } catch (error) {
    console.error('Restock inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restock inventory',
      error: error.message
    });
  }
};

/**
 * @desc    Get inventory transactions
 * @route   GET /api/v1/inventory/:id/transactions
 * @access  Private
 */
export const getInventoryTransactions = async (req, res) => {
  try {
    const transactions = await InventoryTransaction.find({ inventory: req.params.id })
      .populate('worker', 'name email')
      .populate('task', 'title status')
      .populate('confirmedBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

/**
 * @desc    Get low stock items
 * @route   GET /api/v1/inventory/low-stock
 * @access  Private (Admin)
 */
export const getLowStockItems = async (req, res) => {
  try {
    // ✅ جلب المنتجات اللي الكمية فيها أقل من أو تساوي الحد الأدنى
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity.current', '$quantity.minimum'] }
    })
      .populate('branch', 'name')
      .sort('quantity.current'); // ترتيب من الأقل كمية

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
};

export default {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  withdrawInventory,
  restockInventory,
  getInventoryTransactions,
  getLowStockItems
};