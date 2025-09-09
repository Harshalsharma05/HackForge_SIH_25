import { useState, useEffect } from 'react';
import { FaBell, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import './NotificationSystem.css';

const NotificationSystem = ({ notifications, onDismiss }) => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    setVisible(notifications.map(n => n.id));
  }, [notifications]);

  const handleDismiss = (id) => {
    setVisible(prev => prev.filter(nId => nId !== id));
    setTimeout(() => onDismiss(id), 300);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'emergency':
      case 'panic':
        return <FaExclamationTriangle />;
      default:
        return <FaBell />;
    }
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'emergency':
      case 'panic':
        return 'notification-emergency';
      case 'warning':
        return 'notification-warning';
      default:
        return 'notification-info';
    }
  };

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${getNotificationClass(notification.type)} ${
            visible.includes(notification.id) ? 'notification-visible' : 'notification-hidden'
          }`}
        >
          <div className="notification-icon">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
            <div className="notification-time">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <button
            className="notification-close"
            onClick={() => handleDismiss(notification.id)}
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;