import { FaExclamationTriangle } from 'react-icons/fa';

const PanicButton = () => {
    return (
        <div className="panic-button-container">
            <button className="panic-button">
                <FaExclamationTriangle /> PANIC BUTTON
            </button>
        </div>
    );
};

export default PanicButton;