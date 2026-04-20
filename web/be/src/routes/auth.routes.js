const express = require("express");
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  listUsers,
  updateUserLockStatus
} = require("../controllers/auth.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, getMe);
router.get("/users", requireAuth, requireRole("admin"), listUsers);
router.patch("/users/:userId/lock", requireAuth, requireRole("admin"), updateUserLockStatus);

module.exports = router;
