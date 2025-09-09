import { FaClock, FaLanguage, FaPhoneAlt, FaShareAlt, FaPlusSquare } from 'react-icons/fa';

const QuickAccess = () => {
    const items = [
        { icon: <FaClock />, label: 'Itinerary' },
        { icon: <FaLanguage />, label: 'Translate' },
        { icon: <FaPhoneAlt />, label: 'Call Emergency' },
        { icon: <FaShareAlt />, label: 'Share Location' },
        { icon: <FaPlusSquare />, label: 'Nearby Help' },
    ];

    return (
        <div className="card quick-access-card">
            <h2>Quick Access ⚡</h2>
            <div className="quick-access-icons">
                {items.map(item => (
                    <div key={item.label} className="quick-access-item">
                        <div className="icon-wrapper">{item.icon}</div>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickAccess;