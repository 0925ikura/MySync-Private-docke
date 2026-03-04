const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, 'auth.json');

let users = {};

function loadUsers() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = fs.readFileSync(AUTH_FILE, 'utf8');
      users = JSON.parse(data);
      console.log(`[Auth] Loaded ${Object.keys(users).length} user(s)`);
    }
  } catch (e) {
    console.error('[Auth] Failed to load users:', e);
    users = {};
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log('[Auth] Users saved');
  } catch (e) {
    console.error('[Auth] Failed to save users:', e);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateRandomPassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

function createUser(username, password) {
  if (users[username]) {
    return { success: false, message: 'User already exists' };
  }
  
  users[username] = {
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  
  saveUsers();
  return { success: true };
}

function validateUser(username, password) {
  const user = users[username];
  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }
  
  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return { success: false, message: 'Invalid username or password' };
  }
  
  return { success: true, username };
}

function changePassword(username, oldPassword, newPassword) {
  const user = users[username];
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  const oldPasswordHash = hashPassword(oldPassword);
  if (user.passwordHash !== oldPasswordHash) {
    return { success: false, message: 'Old password is incorrect' };
  }
  
  users[username].passwordHash = hashPassword(newPassword);
  users[username].updatedAt = new Date().toISOString();
  saveUsers();
  
  return { success: true };
}

function changeUsername(oldUsername, newUsername) {
  if (!oldUsername || !newUsername) {
    return { success: false, message: 'Username cannot be empty' };
  }
  
  if (oldUsername === newUsername) {
    return { success: false, message: 'New username is the same as old username' };
  }
  
  const user = users[oldUsername];
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  if (users[newUsername]) {
    return { success: false, message: 'New username already exists' };
  }
  
  users[newUsername] = {
    ...user,
    username: newUsername,
    updatedAt: new Date().toISOString()
  };
  
  delete users[oldUsername];
  saveUsers();
  
  return { success: true, username: newUsername };
}

function getUserCount() {
  return Object.keys(users).length;
}

function initializeAdminUser() {
  if (getUserCount() === 0) {
    const username = 'admin';
    const password = generateRandomPassword(12);
    createUser(username, password);
    console.log('========================================');
    console.log('  ADMIN USER CREATED');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log('  PLEASE SAVE THIS PASSWORD!');
    console.log('========================================');
    return { username, password };
  }
  return null;
}

loadUsers();

module.exports = {
  createUser,
  validateUser,
  changePassword,
  changeUsername,
  getUserCount,
  initializeAdminUser,
  loadUsers
};
