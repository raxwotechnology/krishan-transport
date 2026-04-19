import React, { useState } from 'react';
import axios from 'axios';
import logo from '../logo.png';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      if (res.data && res.data.token) {
        localStorage.setItem('kt_auth_token', res.data.token);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection error. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-wrapper">
          <img src={logo} alt="Krishan Transport Logo" className="login-logo" />
        </div>
        <div className="login-header">
          <h2>Admin Access</h2>
          <p>Sign in to manage the transport system</p>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter admin username"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter admin password"
              required 
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
