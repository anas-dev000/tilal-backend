import User from '../models/User.js';
import Branch from '../models/Branch.js';

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const { role, branch, isActive, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('branch', 'name code')
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
 */
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('branch', 'name code address')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    // Update branch worker count if worker
    if (user.role === 'worker' && user.branch) {
      await Branch.findByIdAndUpdate(user.branch, {
        $inc: { totalWorkers: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
export const updateUser = async (req, res) => {
  try {
    // Don't allow password update through this route
    delete req.body.password;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update branch worker count if worker
    if (user.role === 'worker' && user.branch) {
      await Branch.findByIdAndUpdate(user.branch, {
        $inc: { totalWorkers: -1 }
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Get workers
 * @route   GET /api/v1/users/workers
 * @access  Private
 */
export const getWorkers = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, sort = '-workerDetails.rating' } = req.query;
    
    let query = { role: 'worker', isActive: true };
    if (branch) query.branch = branch;

    const workers = await User.find(query)
      .populate('branch', 'name code')
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: workers.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


/**
 * @desc    Get get Worker Details
 * @route   GET /api/v1/users/:id/details
 * @access  Private
 */
export const getWorkerDetails = async (req, res) => {
  try {
    const worker = await User.findById(req.params.id)
      .populate("branch", "name code")
      .select("-password")
      .lean();

    if (!worker || worker.role !== "worker") {
      return res
        .status(404)
        .json({ success: false, message: "Worker not found" });
    }

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};