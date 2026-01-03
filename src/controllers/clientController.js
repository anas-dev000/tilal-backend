import Client from '../models/Client.js';
import Task from '../models/Task.js';
import { generateToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { notifyClientCredentials } from '../services/notificationService.js';

/**
 *   UNIFIED: Client login using standard JWT
 */
export const clientLogin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const client = await Client.findOne({
      $or: [
        { username: username || email },
        { email: email || username }
      ]
    }).select('+password');

    if (!client) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Email or Password'
      });
    }

    if (client.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account is not active. Please contact support.'
      });
    }

    if (!client.password) {
      return res.status(401).json({
        success: false,
        message: 'Please contact admin to set up your account'
      });
    }

    const isMatch = await client.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Email or Password'
      });
    }

    const token = generateToken(client._id, 'client');
    const clientData = client.getPublicProfile();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        client: clientData,
        user: { ...clientData, role: 'client' },
        isPasswordTemporary: client.isPasswordTemporary
      }
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 *  UPDATED: Get all clients with FILTERS
 */
export const getClients = async (req, res) => {
  try {
    const {
      status,
      branch,
      search,
      paymentType,      
      propertyType,     
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    //  Filter by Status
    if (status) {
      query.status = status;
    }

    //  Filter by Payment Type
    if (paymentType) {
      query.paymentType = paymentType;
    }

    //  Filter by Property Type
    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (branch) {
      query.branch = branch;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .populate('branch', 'name address')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Client.countDocuments(query);

    res.status(200).json({
      success: true,
      count: clients.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: clients
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message
    });
  }
};

/**
 * Get single client
 */
export const getClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('branch', 'name address phone');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client',
      error: error.message
    });
  }
};

/**
 * Create new client
 */
export const createClient = async (req, res) => {
  try {
    const clientData = req.body;

    if (!clientData.username) {
      const randomStr = crypto.randomBytes(4).toString('hex');
      clientData.username = `client_${randomStr}`;
    }

    let tempPassword = null;
    if (!clientData.password) {
      tempPassword = crypto.randomBytes(8).toString('hex');
      clientData.password = tempPassword;
      clientData.isPasswordTemporary = true;
    } else {
      clientData.isPasswordTemporary = false;
    }

    const client = await Client.create(clientData);

    if (tempPassword) {
      await notifyClientCredentials(client, clientData.username, tempPassword);
    }

    const clientProfile = client.getPublicProfile();

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        client: clientProfile,
        temporaryPassword: tempPassword || undefined
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: error.message
    });
  }
};

/**
 * Update client
 */
export const updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (req.user.role === 'client' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this client'
      });
    }

    const updateData = req.body;

    if (updateData.password) {
      updateData.isPasswordTemporary = false;
    }

    client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client.getPublicProfile()
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message
    });
  }
};

/**
 * ✅ NEW: Toggle Client Status (Activate/Deactivate)
 */
export const toggleClientStatus = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Toggle between active and inactive
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();

    res.status(200).json({
      success: true,
      message: `Client ${client.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: client.getPublicProfile()
    });
  } catch (error) {
    console.error('Toggle client status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle client status',
      error: error.message
    });
  }
};

/**
 * Delete client
 */
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    await client.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message
    });
  }
};

/**
 * Get client tasks
 */
export const getClientTasks = async (req, res) => {
  try {
    if (req.user.role === 'client' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these tasks'
      });
    }

    const {
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = { client: req.params.id };
    
    // ✅ Apply visibility filter for clients
    if (req.user.role === 'client') {
      query.visibleToClient = true;
    }

    const tasks = await Task.find(query)
      .populate('worker', 'name email phone')
      .populate('branch', 'name')
      .populate('site', 'name siteType')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: tasks
    });
  } catch (error) {
    console.error('Get client tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client tasks',
      error: error.message
    });
  }
};

export default {
  clientLogin,
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientTasks,
  toggleClientStatus
};