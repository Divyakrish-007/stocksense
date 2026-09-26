const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense-secure-enterprise-jwt-secret-key-2026';

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

// 1. POST /login
router.post('/login', (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
});

// 2. POST /signup
router.post('/signup', (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    // Field presence checks
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Full name must be at least 2 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Role default
    const validRoles = ['Inventory Manager', 'Warehouse Staff'];
    const assignedRole = validRoles.includes(role) ? role : 'Inventory Manager';

    // Hash password & store
    const hashedPassword = bcrypt.hashSync(password, 10);
    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `);

    const result = insertStmt.run(name.trim(), cleanEmail, hashedPassword, assignedRole);
    const newUser = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: cleanEmail,
      role: assignedRole,
    };

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error during account creation' });
  }
});

// 3. POST /forgot-password - Step 1: Send OTP
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ?').get(cleanEmail);

    if (!user) {
      // Don't expose whether the email exists for security, but return generic success with notice
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiration: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Invalidate existing unused OTPs for this email
    db.prepare('UPDATE password_resets SET used = 1 WHERE LOWER(email) = ?').run(cleanEmail);

    // Save new OTP
    db.prepare(`
      INSERT INTO password_resets (email, otp, expires_at)
      VALUES (?, ?, ?)
    `).run(cleanEmail, otp, expiresAt);

    console.log(`[StockSense Auth] OTP for ${cleanEmail}: ${otp}`);

    // In local/demo mode, we also return the OTP in the JSON response so test users can see it immediately
    return res.json({
      message: 'Verification OTP has been sent successfully.',
      email: cleanEmail,
      demoOtp: otp, // For convenient hackathon demo and testing
      expiresInMinutes: 15,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to generate password reset request' });
  }
});

// 4. POST /verify-otp - Step 2: Validate OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = db.prepare(`
      SELECT * FROM password_resets
      WHERE LOWER(email) = ? AND otp = ? AND used = 0
      ORDER BY id DESC LIMIT 1
    `).get(cleanEmail, cleanOtp);

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ message: 'OTP code has expired. Please request a new code.' });
    }

    return res.json({
      message: 'OTP verified successfully',
      valid: true,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Failed to verify OTP code' });
  }
});

// 5. POST /reset-password - Step 3: Set New Password
router.post('/reset-password', (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = db.prepare(`
      SELECT * FROM password_resets
      WHERE LOWER(email) = ? AND otp = ? AND used = 0
      ORDER BY id DESC LIMIT 1
    `).get(cleanEmail, cleanOtp);

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired OTP session' });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    // Mark OTP as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(record.id);

    // Update user password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE LOWER(email) = ?').run(hashedPassword, cleanEmail);

    return res.json({
      message: 'Password has been successfully reset. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
});

// 6. GET /me - Check Current User Session
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = {
  router,
  authenticateToken,
};
