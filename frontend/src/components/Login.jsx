import React, { useState } from 'react';
import api from '../services/api';
import { ArrowLeft, User, Lock, Loader2 } from 'lucide-react';
import logo from '../logo.png';
import './Login.css';
import transportBg from '../assets/transport_bg.png';

const Login = ({ onLoginSuccess, roleContext, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data && res.data.token) {
        localStorage.setItem('kt_auth_token', res.data.token);
        localStorage.setItem('kt_user_role', res.data.user.role);
        localStorage.setItem('kt_user_name', res.data.user.name);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-auth-context">
      <div className="login-container" style={{ backgroundImage: `url(${transportBg})` }}>
        <div className="landing-overlay"></div>
        <div className="login-content-wrapper">
          <div className="login-card">
            <button className="back-link" onClick={onBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <div className="login-logo-wrapper">
              <img src={logo} alt="Krishan Transport Logo" className="login-logo" />
            </div>
            <div className="login-header">
              <h2>{roleContext} Portal</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>
            <form className="login-form" onSubmit={handleLogin}>
              {error && <div className="login-error">{error}</div>}
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={20} />
                  <input 
                    id="username"
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="yourname@domain.com"
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input 
                    id="password"
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-loading-content">
                    <Loader2 className="spinner" size={20} /> Authenticating...
                  </span>
                ) : `Sign In as ${roleContext}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
