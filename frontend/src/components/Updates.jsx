import { FaBell, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const Updates = () => {
    return (
        <div className="updates-section">
            <div className="card updates-card">
                <h3><FaBell className="icon" /> Nearby Alerts</h3>
                <div className="alert-item">
                    <FaExclamationTriangle style={{ color: '#fbc02d' }}/> Road closed near City Center
                </div>
                 <div className="alert-item">
                    <FaInfoCircle style={{ color: '#1976d2' }}/> High tourist activity in Old Market
                </div>
            </div>
            <div className="card updates-card">
                <h3><FaExclamationTriangle className="icon" /> Nearby Dangers</h3>
                <ul>
                    <li>Unsafe alleyways</li>
                    <li>Pickpocket Plaza</li>
                </ul>
            </div>
        </div>
    );
};

export default Updates;