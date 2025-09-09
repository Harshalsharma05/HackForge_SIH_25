const UserInfoCard = () => {
    return (
        <div className="card user-info-card">
            <div className="profile-avatar"></div>
            <div className="profile-info">
                <h3>John Doe</h3>
                <p>ID: T123456</p>
            </div>
            <div className="qr-code"></div>
        </div>
    );
};

export default UserInfoCard;