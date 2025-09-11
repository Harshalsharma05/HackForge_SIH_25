import { FaBars } from "react-icons/fa";

const Header = ({ toggleSidebar }) => {
  return (
    <header className="header">
      <div className="header-left">
        {/* This button will only be visible on small screens via CSS */}
        <button className="menu-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <h1>Trayana Dashboard</h1>
      </div>
      <div className="header-right">
        <span>John Doe</span>
        <div className="header-profile-icon"></div>
      </div>
    </header>
  );
};

export default Header;
