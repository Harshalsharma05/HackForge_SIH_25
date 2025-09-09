import React from 'react';
import { FaShieldAlt, FaUser, FaLock } from 'react-icons/fa';
import './AuthorityLoginPage.css';

const AuthorityLoginPage = () => {
    return (
        <div className="login-page-container">
            <div className="auth-login-card">
                <div className="auth-login-header">
                    <FaShieldAlt className="header-icon" />
                    <h2>Authority Portal</h2>
                    <p>For authorized personnel only</p>
                </div>

                <form className="auth-login-form">
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input type="text" placeholder="Authority ID or Email" required />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input type="password" placeholder="Password" required />
                    </div>

                    <button type="submit" className="auth-signin-button">
                        Secure Sign In
                    </button>
                </form>

                <div className="auth-login-footer">
                    <a href="#">Forgot Password?</a>
                </div>
            </div>
        </div>
    );
};

export default AuthorityLoginPage;