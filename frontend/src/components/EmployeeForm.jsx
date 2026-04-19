import React, { useState, useEffect } from 'react';

const EmployeeForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    username: initialData.username || '',
    password: '', // Don't pre-fill password for security
    joinedDate: initialData.joinedDate
      ? new Date(initialData.joinedDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  } : {
    name: '',
    nic: '',
    role: 'Driver',
    contact: '',
    joinedDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only include password if it's set (useful for edits)
    const submittableData = { ...formData };
    if (!submittableData.password && initialData) {
      delete submittableData.password;
    }
    onSubmit(submittableData);
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Kamal Perera"
            required
          />
        </div>
        <div className="form-group">
          <label>NIC Number</label>
          <input
            type="text"
            name="nic"
            value={formData.nic}
            onChange={handleChange}
            placeholder="e.g. 991234567V"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Role</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="Driver">Driver</option>
            <option value="Helper">Helper</option>
            <option value="Mechanic">Mechanic</option>
            <option value="Manager">Manager</option>
            <option value="Admin">Admin</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="form-section-divider">
        <span>Login Credentials</span>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="System login username"
          />
        </div>
        <div className="form-group">
          <label>Password {initialData && '(leave blank to keep current)'}</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="System login password"
            required={!initialData}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Contact Number</label>
          <input
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="e.g. 077 123 4567"
          />
        </div>
        <div className="form-group">
          <label>Joined Date</label>
          <input
            type="date"
            name="joinedDate"
            value={formData.joinedDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary-btn">
          {initialData ? 'Update Employee' : 'Register Employee'}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
