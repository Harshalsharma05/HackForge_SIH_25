import { useState } from 'react';
import { FaShieldAlt, FaUser, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './AuthorityLoginPage.css';

const AuthorityLoginPage = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(credentials);
        
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="login-page-container">
            <div className="auth-login-card">
                <div className="auth-login-header">
                    <FaShieldAlt className="header-icon" />
                    <h2>Authority Portal</h2>
                    <p>For authorized personnel only</p>
                </div>

                <form className="auth-login-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input 
                            type="email" 
                            name="email"
                            placeholder="Authority Email" 
                            value={credentials.email}
                            onChange={handleChange}
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input 
                            type="password" 
                            name="password"
                            placeholder="Password" 
                            value={credentials.password}
                            onChange={handleChange}
                            required 
                        />
                    </div>

                    <button type="submit" className="auth-signin-button" disabled={loading}>
                        {loading ? 'Signing In...' : 'Secure Sign In'}
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