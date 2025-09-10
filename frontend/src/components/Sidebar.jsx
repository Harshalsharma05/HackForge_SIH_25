import { useState } from 'react';
import { 
    FaUserShield, FaAddressBook, FaMapMarkedAlt, FaHistory, FaCog, FaSignOutAlt, 
    FaChevronDown, FaStore, FaUtensils, FaHotel, FaTree 
} from 'react-icons/fa';

// Accept the isOpen prop
const Sidebar = ({ isOpen }) => {
    const [isRecommendedOpen, setRecommendedOpen] = useState(false);

    const toggleRecommended = () => setRecommendedOpen(!isRecommendedOpen);

    return (
        // Conditionally add the 'open' class based on the prop
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-profile">
                <div className="profile-avatar"></div>
                <div className="profile-info">
                    <h3>Tourist Name</h3>
                    <p>tourist@email.com</p>
                </div>
            </div>

            <ul className="nav-menu">
                <li className="nav-item">
                    <a href="#"><FaUserShield className="icon" /> My Digital ID</a>
                </li>
                <li className="nav-item">
                    <a href="#"><FaAddressBook className="icon" /> Emergency Contacts</a>
                </li>
                <li className="nav-item">
                    <div className={`nav-item-header ${isRecommendedOpen ? 'open' : ''}`} onClick={toggleRecommended}>
                        <FaMapMarkedAlt className="icon" />
                        <span>Recommended Places</span>
                        <FaChevronDown className="arrow-icon" />
                    </div>
                    <ul className={`submenu ${isRecommendedOpen ? 'open' : ''}`}>
                        <li className="nav-item"><a href="#"><FaTree className="icon" /> Tourist Attractions</a></li>
                        <li className="nav-item"><a href="#"><FaUtensils className="icon" /> Restaurants</a></li>
                        <li className="nav-item"><a href="#"><FaStore className="icon" /> Shopping Areas</a></li>
                        <li className="nav-item"><a href="#"><FaHotel className="icon" /> Hotels/Hostels</a></li>
                    </ul>
                </li>
                <li className="nav-item">
                    <a href="#"><FaHistory className="icon" /> Travel History</a>
                </li>
                <li className="nav-item">
                    <a href="#"><FaCog className="icon" /> Settings</a>
                </li>
                <li className="nav-item logout-item">
                    <a href="#"><FaSignOutAlt className="icon" /> Logout</a>
                </li>
            </ul>
        </aside>
    );
};

export default Sidebar;