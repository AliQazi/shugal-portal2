import Register from "../models/Register.js";
import jwt from "jsonwebtoken";
import ActivityLog from "../models/activitylogs.js";
import LoginCode from "../models/LoginCode.js";
import crypto from "crypto";
import {
  sendPasswordResetEmail,
  sendCredentialsEmail,
  getAgentRegistrationEmailHTML,
  sendAgentRegistrationEmail,
  sendAgentStatusUpdateEmail,
  sendAdminAgencyRegistrationEmail,
} from "../utils/emailService.js";
import {
  ensureZipAccountExists,
  updateZipAcc,
} from "../utils/zipAccountHelper.js";
import { getPermissionKeysForRole } from "../utils/permissions.js";
import api from "../services/ZipApi.js";
// import { alHaiderAuthMiddleware } from "../middleware/auth.middleware.js";

/* ===========================
   GENERATE JWT
=========================== */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const getUserPermissions = (user) => {
  if (user.userRole === "Super Admin" || user.role === "Super Admin") {
    return getPermissionKeysForRole("Super Admin");
  }

  if (user.isSubUser) {
    return Array.isArray(user.permissions) ? user.permissions : [];
  }

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }

  return getPermissionKeysForRole(user.userRole || user.role);
};

const getInactiveSubUserMessage = (status) => {
  if (status === "Suspended") {
    return "Your sub-user account is suspended. Please contact admin.";
  }

  return `Your sub-user account is ${status}. Please wait for admin activation.`;
};

/**
 * Create ZIP account for agent users
 */
const handleZipAccountCreation = async (user) => {
  try {
    const zipResult = await ensureZipAccountExists({
      name: user.companyName,
      email: user.email,
    });

    if (zipResult.success) {
      console.log(`✅ ZIP account ready for: ${user.email}`);
    } else {
      console.log(
        `⚠️ ZIP account creation warning for ${user.email}:`,
        zipResult.message,
      );
    }
  } catch (zipError) {
    console.error(
      `❌ ZIP account creation error for ${user.email}:`,
      zipError.message,
    );
  }
};

/* ===========================
   REGISTER USER
=========================== */
// export const registerUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       role,
//       companyName,
//       address = "",
//       city = "",
//       password,
//     } = req.body;

//     const userExists = await Register.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({
//         success: false,
//         message: "User already exists",
//       });
//     }
//     const generatedPassword =
//       password || Math.random().toString(36).slice(-8) + "A1!";
//     const plainPassword = generatedPassword;

//     // Set status to Inactive for Agency role, Active for others
//     const status = role === "Agency" ? "Inactive" : "Active";

//     // Generate sequential 4-digit agency code (0001, 0002, ...)
//     let agencyCode = null;
//     if (role === "Agency") {
//       const lastAgency = await Register.find({ agencyCode: { $exists: true } })
//         .sort({ agencyCode: -1 })
//         .limit(1);
//       const lastCode = lastAgency[0]?.agencyCode || "0000";
//       const nextCodeNum = parseInt(lastCode, 10) + 1;
//       agencyCode = nextCodeNum.toString().padStart(4, "0");
//     }

//     // Create account in ZIP API for new agent identity
//     try {
//       const subhead1Response = await api.get("/subhead1");
//       const subheads = subhead1Response.data;
//       const receivables = subheads.find(
//         (item) => item.subhead1_name.toLowerCase() === "receivables",
//       );

//       let subheadIdToSend = null;
//       if (receivables) {
//         const subhead2Response = await api.get("/subhead2");
//         const subhead2List = subhead2Response.data;

//         let agentPortalSubhead2 = subhead2List.find(
//           (item) =>
//             item.subhead2_name.toLowerCase() === "agent portal" &&
//             item.subhead1_id.toString() === receivables._id.toString(),
//         );

//         if (!agentPortalSubhead2) {
//           const createSubhead2Response = await api.post("/subhead2", {
//             subhead2_name: "Agent Portal",
//             subhead1_id: receivables._id,
//             subhead2_status: "active",
//             createdBy: "system",
//           });
//           agentPortalSubhead2 = createSubhead2Response.data;
//         }

//         subheadIdToSend = agentPortalSubhead2._id;
//       } else {
//         const chartHeadRes = await api.get("/chartheads");
//         const chartheads = chartHeadRes.data;
//         const fallback = chartheads.find(
//           (item) => item.charthead_name.toLowerCase() === "assets",
//         );
//         subheadIdToSend = fallback?._id || null;
//       }

//       // await api.post("/accounts", {
//       //   account_name: name,
//       //   subhead_id: subheadIdToSend,
//       // });
//       const createRes = await api.post("/accounts", {
//         account_name: name,
//         subhead_id: subheadIdToSend,
//       });

//       const userId = createRes.data._id;

//       if (userId) {
//         await api.put(`accounts/${userId}`, {
//           account_name: name,
//           phone,
//           email,
//           address,
//           companyName,
//         });
//       }
//       console.log(`✅ Created ZIP account for Agent: ${email}`);
//     } catch (zipError) {
//       console.error(
//         `❌ Failed to create ZIP account for ${email}:`,
//         zipError.message,
//       );
//       // Don't fail the agent identity creation if ZIP account creation fails
//     }

//     const user = await Register.create({
//       name,
//       email,
//       phone,
//       password: generatedPassword,
//       plainPassword,
//       isAutoGeneratedPassword: true,
//       role,
//       companyName,
//       address,
//       city,
//       agencyCode,
//       status,
//     });

//     res.status(201).json({
//       success: true,
//       message: "User registered successfully",
//       token: generateToken(user._id),
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         agencyCode: user.agencyCode,
//       },
//     });
//   } catch (error) {
//     console.error("REGISTER ERROR:", error);

//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const registerUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       role,
//       companyName,
//       address = "",
//       city = "",
//       password,
//     } = req.body;

//     const emailExists = await Register.findOne({ email });
//     if (emailExists) {
//       return res.status(400).json({
//         success: false,
//         message: "A user with this email already exists",
//       });
//     }

//     if (phone) {
//       const phoneExists = await Register.findOne({ phone });
//       if (phoneExists) {
//         return res.status(400).json({
//           success: false,
//           message: "A user with this phone number already exists",
//         });
//       }
//     }
//     const generatedPassword =
//       password || Math.random().toString(36).slice(-8) + "A1!";
//     const plainPassword = generatedPassword;

//     // Set status to Inactive for Agency role, Active for others
//     const status = role === "Agency" ? "Inactive" : "Active";

//     // Generate sequential 4-digit agency code (0001, 0002, ...)
//     let agencyCode = null;
//     if (role === "Agency") {
//       const lastAgency = await Register.find({ agencyCode: { $exists: true } })
//         .sort({ agencyCode: -1 })
//         .limit(1);
//       const lastCode = lastAgency[0]?.agencyCode || "0000";
//       const nextCodeNum = parseInt(lastCode, 10) + 1;
//       agencyCode = nextCodeNum.toString().padStart(4, "0");
//     }

//     // ZIP account will be created when admin activates the agent for the first time

//     const user = await Register.create({
//       name,
//       email,
//       phone,
//       password: generatedPassword,
//       plainPassword,
//       isAutoGeneratedPassword: true,
//       role,
//       companyName,
//       address,
//       city,
//       agencyCode,
//       status,
//     });

//     await ActivityLog.create({
//       user: req.user?._id || user._id,
//       type: "Auth",
//       refModel: "Register",
//       refId: user._id,
//       description: `New user "${user.name}" (${user.role}) registered`,
//     });

//     // Send waiting for admin approval email only to Agency
//     if (role === "Agency") {
//       try {
//         await sendAgentRegistrationEmail(user.email, user.name);
//       } catch (emailError) {
//         console.error(
//           "Agent registration email failed:",
//           emailError.message
//         );
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: "User registered successfully",
//       token: generateToken(user._id),
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         agencyCode: user.agencyCode,
//       },
//     });
//   } catch (error) {
//     console.error("REGISTER ERROR:", error);

//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      role,
      companyName,
      address = "",
      city = "",
      password,
    } = req.body;

    const emailExists = await Register.findOne({ email });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    if (phone) {
      const phoneExists = await Register.findOne({ phone });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "A user with this phone number already exists",
        });
      }
    }

    const generatedPassword =
      password || Math.random().toString(36).slice(-8) + "A1!";

    const plainPassword = generatedPassword;

    const isAgency = role === "Agency";

    // Better for newly registered agency
    const status = isAgency ? "Pending" : "Active";

    let agencyCode = null;

    if (isAgency) {
      const lastAgency = await Register.find({
        agencyCode: { $exists: true, $ne: null },
      })
        .sort({ agencyCode: -1 })
        .limit(1);

      const lastCode = lastAgency[0]?.agencyCode || "0000";
      const nextCodeNum = parseInt(lastCode, 10) + 1;

      agencyCode = nextCodeNum.toString().padStart(4, "0");
    }

    const user = await Register.create({
      name,
      email,
      phone,
      password: generatedPassword,
      plainPassword,
      isAutoGeneratedPassword: true,
      role,
      companyName,
      address,
      city,
      agencyCode,
      status,
    });

    await ActivityLog.create({
      user: req.user?._id || user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `New user "${user.name}" (${user.role}) registered`,
    });

    if (isAgency) {
      // Email to agency user
      try {
        await sendAgentRegistrationEmail(user.email, user.name);
      } catch (emailError) {
        console.error("Agent registration email failed:", emailError.message);
      }

      // Email to admin
      try {
        await sendAdminAgencyRegistrationEmail({
          name: user.name,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
          address: user.address,
          city: user.city,
          agencyCode: user.agencyCode,
          status: user.status,
        });
      } catch (adminEmailError) {
        console.error(
          "Admin agency registration email failed:",
          adminEmailError.message,
        );
      }
    }

    res.status(201).json({
      success: true,
      message: isAgency
        ? "Agency registered successfully. Please wait for admin approval."
        : "User registered successfully",
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        agencyCode: user.agencyCode,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/* ===========================
   LOGIN USER
=========================== */
/* ===========================
   LOGIN USER
=========================== */

export const loginUser = async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      // agencyCode
    } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone number is required",
      });
    }

    const query = email ? { email } : { phone };
    const user = await Register.findOne(query).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not Found",
      });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // if (user.role === "Agency") {
    //   const storedCode = user.agencyCode?.toLowerCase().trim();
    //   const incomingCode = agencyCode?.toLowerCase().trim();
    //   if (!incomingCode || !storedCode || storedCode !== incomingCode) {
    //     return res.status(401).json({
    //       success: false,
    //       message: "Invalid agent code",
    //       status: user.status,
    //       role: user.role
    //     });
    //   }
    // }

    // Check if user is an Agency and verify their status
    if (user.role === "Agency" && user.status !== "Active") {
      const msg =
        user.status === "Suspended"
          ? "Your account is suspended. Please contact admin."
          : `Your agency account is ${user.status}. Please wait for admin approval.`;

      return res.status(403).json({
        success: false,
        message: msg,
        status: user.status,
        role: user.role,
      });
    }

    if (user.isSubUser && user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: getInactiveSubUserMessage(user.status),
        status: user.status,
        role: user.role,
        isSubUser: true,
      });
    }

    // For Agency role, call preAuthMiddleware before returning response
    // if (user.role === "Agency") {
    //   return alHaiderAuthMiddleware(req, res, (err) => {
    //     if (err) {
    //       return res.status(503).json({
    //         success: false,
    //         message: "External authentication failed",
    //         error: process.env.NODE_ENV === "development" ? err.message : undefined
    //       });
    //     }

    //     // Update last login before response
    //     user.lastLogin = new Date();
    //     user.save().then(() => {
    //       // Only return success if middleware passed
    //       res.status(200).json({
    //         success: true,
    //         token: generateToken(user._id),
    //         user: {
    //           id: user._id,
    //           name: user.name,
    //           email: user.email,
    //           role: user.role,
    //           status: user.status
    //         }
    //       });
    //     }).catch(err => {
    //       console.error("Error saving last login:", err);
    //       // Still return success even if lastLogin save fails
    //       res.status(200).json({
    //         success: true,
    //         token: generateToken(user._id),
    //         user: {
    //           id: user._id,
    //           name: user.name,
    //           email: user.email,
    //           role: user.role,
    //           status: user.status
    //         }
    //       });
    //     });
    //   });
    // }

    // Update last login for non-Agency roles before proceeding
    user.lastLogin = new Date();
    await user.save();

    await ActivityLog.create({
      user: user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" (${user.role}) logged in`,
    });

    // Get permissions: use stored permissions for sub-users, calculate from role for others
    let permissions = getUserPermissions(user);
    if (
      false &&
      user.isSubUser &&
      Array.isArray(user.permissions) &&
      user.permissions.length > 0
    ) {
      // Sub-user with custom permissions - use them as-is
      permissions = user.permissions;
      console.log(
        `✅ Sub-user ${user.email} using custom permissions (${permissions.length})`,
      );
    } else if (false) {
      // Regular user - calculate permissions from their role
      const roleToUse = user.userRole || user.role;
      permissions = getPermissionKeysForRole(roleToUse);
      console.log(
        `✅ Regular user ${user.email} using role permissions for ${roleToUse} (${permissions.length})`,
      );
    }

    // For non-Agency roles, return response directly
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userRole: user.userRole,
        isSubUser: user.isSubUser,
        parentAdminId: user.parentAdminId,
        companyName: user.companyName,
        status: user.status,
        priceOnCall: user.priceOnCall || false,
        showHideButton: user.showHideButton || false,
        permissions: permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   EXCHANGE LOGIN CODE
=========================== */
export const exchangeLoginCode = async (req, res) => {
  try {
    const { code } = req.body;

    const DOMAIN_B = process.env.DOMAIN_B || "abidairtravels.com";
    const DASHBOARD_COOKIE_NAME =
      process.env.DASHBOARD_COOKIE_NAME || "dashboard_token";

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Login code is required",
      });
    }

    const loginCode = await LoginCode.findOneAndUpdate(
      {
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { used: true },
      },
      {
        new: true,
      },
    );

    if (!loginCode) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired login code",
      });
    }

    const user = await Register.findById(loginCode.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    if (isProduction) {
      cookieOptions.domain = DOMAIN_B;
    }

    res.cookie(DASHBOARD_COOKIE_NAME, token, cookieOptions);

    let permissions = getUserPermissions(user);

    return res.status(200).json({
      success: true,
      message: "Dashboard login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userRole: user.userRole,
        isSubUser: user.isSubUser,
        parentAdminId: user.parentAdminId,
        companyName: user.companyName,
        status: user.status,
        priceOnCall: user.priceOnCall || false,
        showHideButton: user.showHideButton || false,
        permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET LOGGED-IN PROFILE
=========================== */
export const getProfile = async (req, res) => {
  try {
    const user = await Register.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get permissions: use stored permissions for sub-users, calculate from role for others
    let permissions = getUserPermissions(user);
    if (
      false &&
      user.isSubUser &&
      Array.isArray(user.permissions) &&
      user.permissions.length > 0
    ) {
      // Sub-user with custom permissions - use them as-is
      permissions = user.permissions;
      console.log(
        `✅ Sub-user ${user.email} using custom permissions (${permissions.length})`,
      );
    } else if (false) {
      // Regular user - calculate permissions from their role
      const roleToUse = user.userRole || user.role;
      permissions = getPermissionKeysForRole(roleToUse);
      console.log(
        `✅ Regular user ${user.email} using role permissions for ${roleToUse} (${permissions.length})`,
      );
    }

    // Convert user to object and add permissions
    const userResponse = user.toObject();
    userResponse.permissions = permissions;

    res.status(200).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL USERS (ADMIN)
=========================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await Register.find({ isDeleted: { $ne: true } }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET USER BY ID (ADMIN)
=========================== */
export const getUserById = async (req, res) => {
  try {
    const user = await Register.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE USER DETAILS (ADMIN)
=========================== */
export const updateUserProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      companyName,
      address,
      city,
      country,
      consultant,
      marginType,
      flightMarginPercent,
      flightMarginAmount,
      status,
      password,
      registeredFrom,
      logo,
    } = req.body;

    // here we will update the zip account of the user
    const zipData = {
      name,
      address,
      companyName,
      consultant,
      phone,
      cell: phone,
    };

    const updateRes = await updateZipAcc(zipData);

    // If req.params.id exists, use it (admin updating user), otherwise use req.user.id (user updating own profile)
    const userId = req.params.id || req.user.id;
    const user = await Register.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (companyName !== undefined) user.companyName = companyName;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (country !== undefined) user.country = country;
    if (consultant !== undefined) user.consultant = consultant;
    if (marginType !== undefined) user.marginType = marginType;
    if (flightMarginPercent !== undefined)
      user.flightMarginPercent = flightMarginPercent;
    if (flightMarginAmount !== undefined)
      user.flightMarginAmount = flightMarginAmount;
    if (status !== undefined) user.status = status;

    // Handle logo upload (supports base64 or Cloudinary URL from file upload)
    if (logo !== undefined) {
      user.logo = logo;
    } else if (req.file) {
      // If using Cloudinary multer upload
      user.logo = req.file.path;
    }

    if (registeredFrom !== undefined) {
      user.registeredFrom = {
        ...user.registeredFrom,
        ...registeredFrom,
      };
    }

    if (password) {
      user.password = password;
      user.plainPassword = password;
      user.isAutoGeneratedPassword = false;
    }

    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" profile updated`,
    });

    const { password: _pwd, ...safeUser } = user.toObject();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: safeUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE USER STATUS
=========================== */
// export const updateUserStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const updates = { status };

//     // Track who activated and when
//     if (status === "Active") {
//       updates.activatedBy = req.user?.name || req.user?.email || "Admin";
//       updates.activatedAt = new Date();
//       updates.deactivatedBy = "";
//       updates.deactivatedAt = null;
//     }

//     // Track who deactivated and when
//     if (status === "Inactive") {
//       updates.deactivatedBy = req.user?.name || req.user?.email || "Admin";
//       updates.deactivatedAt = new Date();
//       updates.activatedAt = null;
//     }

//     if (status !== "Active" && status !== "Inactive") {
//       updates.activatedAt = null;
//     }

//     const user = await Register.findByIdAndUpdate(req.params.id, updates, {
//       new: true,
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "User status updated",
//       data: user,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const updateUserStatus = async (req, res) => {
//   try {
//     const { status } = req.body;

//     // Get user before update to check if this is first activation
//     const userBefore = await Register.findById(req.params.id);
//     if (!userBefore) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const updates = { status };

//     // Track who activated and when
//     if (status === "Active") {
//       updates.activatedBy = req.user?.name || req.user?.email || "Admin";
//       updates.activatedAt = new Date();
//       updates.deactivatedBy = "";
//       updates.deactivatedAt = null;
//     }

//     // Track who deactivated and when
//     if (status === "Inactive") {
//       updates.deactivatedBy = req.user?.name || req.user?.email || "Admin";
//       updates.deactivatedAt = new Date();
//       updates.activatedAt = null;
//     }

//     if (status !== "Active" && status !== "Inactive") {
//       updates.activatedAt = null;
//     }

//     const user = await Register.findByIdAndUpdate(req.params.id, updates, {
//       new: true,
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Create ZIP account when agent is activated for the first time
//     if (!user.zipId && user.role === "Agency") {
//       try {
//         const subhead1Response = await api.get("/subhead1");
//         const subheads = subhead1Response.data;
//         const receivables = subheads.find(
//           (item) => item.subhead1_name.toLowerCase() === "receivables",
//         );

//         let subheadIdToSend = null;
//         if (receivables) {
//           const subhead2Response = await api.get("/subhead2");
//           const subhead2List = subhead2Response.data;

//           let agentPortalSubhead2 = subhead2List.find(
//             (item) =>
//               item.subhead2_name.toLowerCase() === "agent portal" &&
//               item.subhead1_id.toString() === receivables._id.toString(),
//           );

//           if (!agentPortalSubhead2) {
//             const createSubhead2Response = await api.post("/subhead2", {
//               subhead2_name: "Agent Portal",
//               subhead1_id: receivables._id,
//               subhead2_status: "active",
//               createdBy: "system",
//             });
//             agentPortalSubhead2 = createSubhead2Response.data;
//           }

//           subheadIdToSend = agentPortalSubhead2._id;
//         } else {
//           const chartHeadRes = await api.get("/chartheads");
//           const chartheads = chartHeadRes.data;
//           const fallback = chartheads.find(
//             (item) => item.charthead_name.toLowerCase() === "assets",
//           );
//           subheadIdToSend = fallback?._id || null;
//         }

//         const createRes = await api.post("/accounts", {
//           account_name: user.companyName,
//           subhead_id: subheadIdToSend,
//         });

//         const zipUserId = createRes.data._id;
//         if (zipUserId) {
//           await api.put(`accounts/${zipUserId}`, {
//             account_name: user.companyName,
//             phone: user.phone,
//             email: user.email,
//             address: user.address,
//             companyName: user.companyName,
//           });
//           await Register.findByIdAndUpdate(user._id, { zipId: zipUserId });
//         }
//         console.log(
//           `✅ Created ZIP account for Agent on activation: ${user.email}`,
//         );
//       } catch (zipError) {
//         console.error(
//           `❌ Failed to create ZIP account for ${user.email}:`,
//           zipError.message,
//         );
//         // Don't fail the activation if ZIP account creation fails
//       }
//     }

//     await ActivityLog.create({
//       user: req.user._id,
//       type: "Auth",
//       refModel: "Register",
//       refId: user._id,
//       description: `User "${user.name}" status changed to "${user.status}"`,
//     });

//     res.status(200).json({
//       success: true,
//       message: "User status updated",
//       data: user,
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["Active", "Inactive", "Pending"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed statuses are Active, Inactive, Pending",
      });
    }

    const userBefore = await Register.findById(req.params.id);

    if (!userBefore) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldStatus = userBefore.status;

    const updates = { status };

    if (status === "Active") {
      updates.activatedBy = req.user?.name || req.user?.email || "Admin";
      updates.activatedAt = new Date();
      updates.deactivatedBy = "";
      updates.deactivatedAt = null;
    }

    if (status === "Inactive") {
      updates.deactivatedBy = req.user?.name || req.user?.email || "Admin";
      updates.deactivatedAt = new Date();
      updates.activatedAt = null;
    }

    if (status === "Pending") {
      updates.activatedBy = "";
      updates.activatedAt = null;
      updates.deactivatedBy = "";
      updates.deactivatedAt = null;
    }

    const user = await Register.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create ZIP account only when Agency is activated and ZIP account does not exist
    if (status === "Active" && !user.zipId && user.role === "Agency") {
      try {
        const subhead1Response = await api.get("/subhead1");
        const subheads = subhead1Response.data;

        const receivables = subheads.find(
          (item) => item.subhead1_name?.toLowerCase() === "receivables",
        );

        let subheadIdToSend = null;

        if (receivables) {
          const subhead2Response = await api.get("/subhead2");
          const subhead2List = subhead2Response.data;

          let agentPortalSubhead2 = subhead2List.find(
            (item) =>
              item.subhead2_name?.toLowerCase() === "agent portal" &&
              item.subhead1_id?.toString() === receivables._id.toString(),
          );

          if (!agentPortalSubhead2) {
            const createSubhead2Response = await api.post("/subhead2", {
              subhead2_name: "Agent Portal",
              subhead1_id: receivables._id,
              subhead2_status: "active",
              createdBy: "system",
            });

            agentPortalSubhead2 = createSubhead2Response.data;
          }

          subheadIdToSend = agentPortalSubhead2._id;
        } else {
          const chartHeadRes = await api.get("/chartheads");
          const chartheads = chartHeadRes.data;

          const fallback = chartheads.find(
            (item) => item.charthead_name?.toLowerCase() === "assets",
          );

          subheadIdToSend = fallback?._id || null;
        }

        const createRes = await api.post("/accounts", {
          account_name: user.companyName || user.name,
          subhead_id: subheadIdToSend,
        });

        const zipUserId = createRes.data?._id;

        if (zipUserId) {
          await api.put(`/accounts/${zipUserId}`, {
            account_name: user.companyName || user.name,
            phone: user.phone,
            email: user.email,
            address: user.address,
            companyName: user.companyName,
          });

          await Register.findByIdAndUpdate(user._id, {
            zipId: zipUserId,
          });

          user.zipId = zipUserId;
        }

        console.log(
          `✅ Created ZIP account for Agent on activation: ${user.email}`,
        );
      } catch (zipError) {
        console.error(
          `❌ Failed to create ZIP account for ${user.email}:`,
          zipError.message,
        );
      }
    }

    await ActivityLog.create({
      user: req.user?._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" status changed from "${oldStatus}" to "${user.status}"`,
    });

    // Send agent status email only if status changed
    if (user.role === "Agency" && oldStatus !== user.status) {
      try {
        await sendAgentStatusUpdateEmail({
          email: user.email,
          name: user.name,
          status: user.status,
          agencyCode: user.agencyCode || "N/A",
          companyName: user.companyName || "N/A",
        });
      } catch (emailError) {
        console.error("Agent status email failed:", emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "User status updated",
      data: user,
    });
  } catch (error) {
    console.error("UPDATE USER STATUS ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updatePriceOnCall = async (req, res) => {
  console.log(req.body, "req.body");
  try {
    const { priceOnCall } = req.body;

    const user = await Register.findByIdAndUpdate(
      req.params.id,
      { priceOnCall: priceOnCall },
      { new: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `Price on call set to "${user.priceOnCall}" for user "${user.name}"`,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateShowHideButton = async (req, res) => {
  try {
    const { showHideButton } = req.body;

    const user = await Register.findByIdAndUpdate(
      req.params.id,
      { showHideButton: showHideButton },
      { new: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `Show/hide button set to "${user.showHideButton}" for user "${user.name}"`,
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateBookNowButtonBulk = async (req, res) => {
  try {
    const { showHideButton } = req.body;

    if (typeof showHideButton !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "showHideButton must be true or false",
      });
    }

    const result = await Register.updateMany(
      { role: "Agency" },
      { $set: { showHideButton } },
    );

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      description: `Book Now button bulk set to "${showHideButton ? "ON" : "OFF"}" for all agencies (${result.modifiedCount} updated)`,
    });

    res.json({
      success: true,
      message: `Booking Now turned ${showHideButton ? "ON" : "OFF"} for all agencies`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk Booking Now Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   DELETE USER
=========================== */
export const deleteUser = async (req, res) => {
  try {
    const existing = await Register.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (existing.status !== "Inactive") {
      return res.status(400).json({
        success: false,
        message:
          "Only inactive agents can be deleted. Please deactivate the agent first.",
      });
    }

    const user = await Register.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      description: `User "${user.name}" (${user.role}) deleted`,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET DELETED USERS (ADMIN)
=========================== */
export const getDeletedUsers = async (req, res) => {
  try {
    const users = await Register.find({ isDeleted: true }).sort({
      deletedAt: -1,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   RECOVER DELETED USER (ADMIN)
=========================== */
export const recoverUser = async (req, res) => {
  try {
    const user = await Register.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Deleted agent not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" (${user.role}) recovered from deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Agent recovered successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   CHANGE PASSWORD (FOR LOGGED-IN USER)
=========================== */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const user = await Register.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.plainPassword = newPassword;
    user.isAutoGeneratedPassword = false;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" changed their password`,
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   REQUEST PASSWORD RESET (FORGOT PASSWORD)
=========================== */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await Register.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate a reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user._id, type: "reset" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // Send email with reset link
    try {
      await sendPasswordResetEmail(
        email,
        resetToken,
        user._id.toString(),
        user.name,
      );

      res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your email",
        // In development, you might want to include the token for testing
        ...(process.env.NODE_ENV === "development" && {
          resetToken: resetToken,
          userId: user._id,
        }),
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);

      // If email fails, still return token for testing (in dev only)
      if (process.env.NODE_ENV === "development") {
        return res.status(200).json({
          success: true,
          message:
            "Email service unavailable. Here's your reset token for testing:",
          resetToken: resetToken,
          userId: user._id,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   RESET PASSWORD (WITH RESET TOKEN)
=========================== */
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, userId } = req.body;

    if (!resetToken || !newPassword || !userId) {
      return res.status(400).json({
        success: false,
        message: "Reset token, user ID, and new password are required",
      });
    }

    // Verify the reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    if (decoded.type !== "reset" || decoded.id !== userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    user.plainPassword = newPassword;
    user.isAutoGeneratedPassword = false;
    await user.save();

    await ActivityLog.create({
      user: user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `User "${user.name}" reset their password via reset link`,
    });

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Reset token has expired",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   CHANGE USER PASSWORD (ADMIN ONLY)
=========================== */
export const changeUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "User ID and new password are required",
      });
    }

    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Auth",
      refModel: "Register",
      refId: user._id,
      description: `Admin changed password for user "${user.name}" (${user.role})`,
    });

    res.status(200).json({
      success: true,
      message: `Password for ${user.name} (${user.role}) has been changed successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SEND CREDENTIALS EMAIL
=========================== */
export const sendUserCredentials = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await Register.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.agencyCode || !user.email || !user.plainPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required credentials. Ensure agent code, email, and password are available.",
      });
    }

    // Send credentials email
    await sendCredentialsEmail(
      user.email,
      user.agencyCode,
      user.plainPassword,
      user.name,
      user.companyName || "N/A",
    );

    res.status(200).json({
      success: true,
      message: `Credentials have been sent successfully to ${user.email}`,
    });
  } catch (error) {
    console.error("Error sending credentials:", error);
    res.status(500).json({
      success: false,
      message:
        "Failed to send credentials email. Please check email configuration.",
    });
  }
};

/* ===========================
   LOGOUT USER
=========================== */
export const logoutUser = async (req, res) => {
  try {
    const DOMAIN_B = process.env.DOMAIN_B || "abidairtravels.com";
    const DASHBOARD_COOKIE_NAME =
      process.env.DASHBOARD_COOKIE_NAME || "dashboard_token";

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    };

    if (isProduction) {
      cookieOptions.domain = DOMAIN_B;
    }

    res.clearCookie(DASHBOARD_COOKIE_NAME, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const ssoRedirect = async (req, res) => {
  try {
    const { code } = req.query;

    const DOMAIN_A = process.env.DOMAIN_A || "abidairtravels.com"; // login domain
    const DOMAIN_B = process.env.DOMAIN_B || "abidairtravels.com"; // dashboard domain
    const DASHBOARD_COOKIE_NAME =
      process.env.DASHBOARD_COOKIE_NAME || "dashboard_token";

    if (!code) {
      return res.redirect(`https://${DOMAIN_A}/login`);
    }

    const loginCode = await LoginCode.findOneAndUpdate(
      {
        code,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { used: true },
      },
      {
        new: true,
      },
    );

    if (!loginCode) {
      return res.redirect(`https://${DOMAIN_A}/login`);
    }

    const user = await Register.findById(loginCode.userId);

    if (!user) {
      return res.redirect(`https://${DOMAIN_A}/login`);
    }

    const token = generateToken(user._id);

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    if (isProduction) {
      cookieOptions.domain = DOMAIN_B;
    }

    res.cookie(DASHBOARD_COOKIE_NAME, token, cookieOptions);

    return res.redirect(`https://${DOMAIN_B}/dashboard`);
  } catch (error) {
    const DOMAIN_A = process.env.DOMAIN_A || "abidairtravels.com";
    return res.redirect(`https://${DOMAIN_A}/login`);
  }
};
