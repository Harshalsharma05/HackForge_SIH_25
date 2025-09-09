import Header from '../components/Header';
import UserInfoCard from '../components/UserInfoCard';
import SafetyScoreCard from '../components/SafetyScoreCard';
import QuickAccess from '../components/QuickAccess';
import Updates from '../components/Updates';
import PanicButton from '../components/PanicButton';

const Dashboard = ({ toggleSidebar }) => {
    return (
        <>
            <Header toggleSidebar={toggleSidebar} />
            <div className="dashboard-grid">
                <UserInfoCard />
                <SafetyScoreCard />
                <QuickAccess />
                <Updates />
                <PanicButton />
            </div>
        </>
    );
};

export default Dashboard;