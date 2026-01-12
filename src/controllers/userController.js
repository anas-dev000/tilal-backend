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
    // ✅ Handle File Uploads (Worker Profile)
    if (req.uploadedFiles) {
      if (req.uploadedFiles.profilePicture) {
        req.body.profilePicture = req.uploadedFiles.profilePicture;
      }
      if (req.uploadedFiles.contractPdf) {
         req.body.contractPdf = req.uploadedFiles.contractPdf;
      }

      // Initialize documents object
      req.body.documents = req.body.documents || {};
      
      // Single files
      if (req.uploadedFiles.residencePhoto) req.body.documents.residence = req.uploadedFiles.residencePhoto;
      if (req.uploadedFiles.licensePhoto) req.body.documents.license = req.uploadedFiles.licensePhoto;
      if (req.uploadedFiles.idPhoto) req.body.documents.identity = req.uploadedFiles.idPhoto;
      
      // Multiple files (otherFiles)
      // We need to access the array from req.files because req.uploadedFiles might only have one URL
      if (req.files && req.files.otherFiles) {
         req.body.documents.files = req.files.otherFiles.map(file => ({
           name: file.originalname,
           url: file.cloudinaryUrl
         }));
      }
    }

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

    // ✅ Handle File Uploads (Worker Profile)
    const updateOperations = { ...req.body };
    // Remove complex fields from direct set if handled separately
    delete updateOperations.documents; 

    // Initialize $set for specific document fields
    const setOperations = {};

    // ✅ Handle File Removals (Explicit flags) - Single fields
    // Place this BEFORE file uploads so uploads can overwrite "null" if replacing
    if (req.body.remove_profilePicture === 'true') setOperations.profilePicture = null;
    if (req.body.remove_contractPdf === 'true') setOperations.contractPdf = null;
    if (req.body.remove_residencePhoto === 'true') setOperations['documents.residence'] = null;
    if (req.body.remove_licensePhoto === 'true') setOperations['documents.license'] = null;
    if (req.body.remove_idPhoto === 'true') setOperations['documents.identity'] = null;

    if (req.uploadedFiles) {
      if (req.uploadedFiles.profilePicture) {
        setOperations.profilePicture = req.uploadedFiles.profilePicture;
      }
      if (req.uploadedFiles.contractPdf) {
        setOperations.contractPdf = req.uploadedFiles.contractPdf;
      }
      
      if (req.uploadedFiles.residencePhoto) setOperations['documents.residence'] = req.uploadedFiles.residencePhoto;
      if (req.uploadedFiles.licensePhoto) setOperations['documents.license'] = req.uploadedFiles.licensePhoto;
      if (req.uploadedFiles.idPhoto) setOperations['documents.identity'] = req.uploadedFiles.idPhoto;
      
      // Handle Multiple Files (Append)
      if (req.files && req.files.otherFiles) {
         const newFiles = req.files.otherFiles.map(file => ({
           name: file.originalname,
           url: file.cloudinaryUrl
         }));
         
         // Use $push to add new files
         updateOperations['$push'] = { 'documents.files': { $each: newFiles } };
      }
    }

    // ✅ Handle Additional Files Removal (Pull from array)
    if (req.body.remove_otherFiles) {
        let filesToRemove = req.body.remove_otherFiles;
        if (!Array.isArray(filesToRemove)) {
            filesToRemove = [filesToRemove];
        }
        
        // Execute Pull separately to avoid conflict with $push on same path ('documents.files')
        if (filesToRemove.length > 0) {
            await User.findByIdAndUpdate(req.params.id, {
                $pull: { 'documents.files': { url: { $in: filesToRemove } } }
            });
        }
    }


    // Merge setOperations into updateOperations direct keys (which are $set in Mongoose default, 
    // BUT since we are mixing with $push, we must be careful. 
    // findByIdAndUpdate(id, update, ...) -> if update has $ keys, non-$ keys are ignored or need to be inside $set?
    // Mongoose: if top level has $-keys, then non-$ keys are strictly ignored or throw?
    // Actually, usually you wrap everything in $set if you use any $ operator.
    
    // Let's safe-guard:
    // Move all non-$ keys to $set
    updateOperations['$set'] = { ...setOperations };
    
    // Also move original req.body fields (text) to $set if they are not there
    Object.keys(req.body).forEach(key => {
        if (key !== 'documents' && key !== 'password') {
            updateOperations['$set'][key] = req.body[key];
        }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateOperations,
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

/**
 * @desc    Toggle User Status (Activate/Deactivate)
 * @route   PUT /api/v1/users/:id/toggle-status
 * @access  Private/Admin
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle between active and inactive
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user.getPublicProfile ? user.getPublicProfile() : user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
};