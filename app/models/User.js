// models/User.js
export class User {
  constructor({
    id = null,
    uid = null,
    fullName,
    email,
    isAdmin = false,
    createdAt = null,
    updatedAt = null,
    lastLoginAt = null,
    profileImage = null,
    phone = null,
    address = null,
    dateOfBirth = null,
    isActive = true
  }) {
    this.id = id;
    this.uid = uid;
    this.fullName = fullName;
    this.email = email;
    this.isAdmin = isAdmin;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
    this.lastLoginAt = lastLoginAt;
    this.profileImage = profileImage;
    this.phone = phone;
    this.address = address;
    this.dateOfBirth = dateOfBirth;
    this.isActive = isActive;
  }

  // Validate user data
  validate() {
    const errors = [];

    if (!this.fullName || this.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push('Please enter a valid email address');
    }

    return errors;
  }

  // Email validation helper
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Convert to Firestore document format
  toFirestore() {
    return {
      uid: this.uid,
      fullName: this.fullName,
      email: this.email,
      isAdmin: this.isAdmin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      profileImage: this.profileImage,
      phone: this.phone,
      address: this.address,
      dateOfBirth: this.dateOfBirth,
      isActive: this.isActive
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new User({
      id: doc.id,
      ...data
    });
  }

  // Update last login time
  updateLastLogin() {
    this.lastLoginAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Update profile information
  updateProfile(updates) {
    Object.keys(updates).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = updates[key];
      }
    });
    this.updatedAt = new Date().toISOString();
  }

  // Check if user is admin
  hasAdminPrivileges() {
    return this.isAdmin === true;
  }

  // Get display name (fallback to email if no full name)
  getDisplayName() {
    return this.fullName || this.email || 'User';
  }

  // Get user initials for avatar
  getInitials() {
    if (!this.fullName) return 'U';
    
    const names = this.fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }

  // Check if user account is active
  isAccountActive() {
    return this.isActive === true;
  }

  // Deactivate user account
  deactivateAccount() {
    this.isActive = false;
    this.updatedAt = new Date().toISOString();
  }

  // Activate user account
  activateAccount() {
    this.isActive = true;
    this.updatedAt = new Date().toISOString();
  }
}

export default User;
