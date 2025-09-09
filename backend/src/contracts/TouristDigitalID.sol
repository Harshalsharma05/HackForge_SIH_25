// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TouristDigitalID
 * @dev Smart contract for managing blockchain-based tourist digital IDs
 * @notice This contract creates tamper-proof digital identities for tourists
 */
contract TouristDigitalID {
    
    // Events for logging important actions
    event DigitalIDCreated(
        string indexed digitalId,
        address indexed touristWallet,
        uint256 validUntil,
        string ipfsHash
    );
    
    event DigitalIDVerified(
        string indexed digitalId,
        address indexed verifier,
        uint256 timestamp
    );
    
    event DigitalIDRevoked(
        string indexed digitalId,
        address indexed revoker,
        uint256 timestamp
    );

    // Structure to store digital ID information
    struct DigitalID {
        string digitalId;           // Unique ID string
        address touristWallet;      // Tourist's wallet address
        string ipfsHash;           // IPFS hash containing encrypted metadata
        uint256 createdAt;         // Creation timestamp
        uint256 validUntil;        // Expiry timestamp
        bool isActive;             // Active status
        bool isRevoked;            // Revocation status
        address createdBy;         // Who created this ID (system wallet)
        uint256 verificationCount; // Number of times verified
    }

    // Mappings for efficient data storage and retrieval
    mapping(string => DigitalID) public digitalIDs;
    mapping(address => string[]) public touristToIDs;
    mapping(string => address[]) public verificationHistory;
    
    // Contract owner (system admin)
    address public owner;
    
    // Authorized verifiers (police, tourism officers, etc.)
    mapping(address => bool) public authorizedVerifiers;
    
    // Statistics
    uint256 public totalIDsCreated;
    uint256 public totalVerifications;

    // Modifiers for access control
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedVerifier() {
        require(
            authorizedVerifiers[msg.sender] || msg.sender == owner,
            "Only authorized verifiers can perform this action"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedVerifiers[msg.sender] = true; // Owner is automatically authorized
    }

    /**
     * @dev Create a new digital ID for a tourist
     * @param _digitalId Unique identifier for the digital ID
     * @param _touristWallet Tourist's wallet address
     * @param _ipfsHash IPFS hash containing encrypted tourist data
     * @param _validUntil Timestamp until which the ID is valid
     */
    function createDigitalID(
        string memory _digitalId,
        address _touristWallet,
        string memory _ipfsHash,
        uint256 _validUntil
    ) external onlyOwner {
        require(bytes(_digitalId).length > 0, "Digital ID cannot be empty");
        require(_touristWallet != address(0), "Invalid tourist wallet address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_validUntil > block.timestamp, "Expiry date must be in future");
        require(!digitalIDExists(_digitalId), "Digital ID already exists");

        // Create the digital ID
        digitalIDs[_digitalId] = DigitalID({
            digitalId: _digitalId,
            touristWallet: _touristWallet,
            ipfsHash: _ipfsHash,
            createdAt: block.timestamp,
            validUntil: _validUntil,
            isActive: true,
            isRevoked: false,
            createdBy: msg.sender,
            verificationCount: 0
        });

        // Add to tourist's ID list
        touristToIDs[_touristWallet].push(_digitalId);
        
        // Update statistics
        totalIDsCreated++;

        emit DigitalIDCreated(_digitalId, _touristWallet, _validUntil, _ipfsHash);
    }

    /**
     * @dev Verify a digital ID (called by authorities)
     * @param _digitalId The digital ID to verify
     * @return isValid Whether the ID is valid
     * @return touristWallet Tourist's wallet address
     * @return ipfsHash IPFS hash for metadata
     * @return validUntil Expiry timestamp
     */
    function verifyDigitalID(string memory _digitalId) 
        external 
        onlyAuthorizedVerifier 
        returns (
            bool isValid,
            address touristWallet,
            string memory ipfsHash,
            uint256 validUntil
        ) 
    {
        require(digitalIDExists(_digitalId), "Digital ID does not exist");
        
        DigitalID storage digitalID = digitalIDs[_digitalId];
        
        // Check if ID is currently valid
        isValid = digitalID.isActive && 
                 !digitalID.isRevoked && 
                 block.timestamp <= digitalID.validUntil;
        
        if (isValid) {
            // Increment verification count
            digitalID.verificationCount++;
            
            // Record verification
            verificationHistory[_digitalId].push(msg.sender);
            totalVerifications++;
            
            emit DigitalIDVerified(_digitalId, msg.sender, block.timestamp);
        }
        
        return (
            isValid,
            digitalID.touristWallet,
            digitalID.ipfsHash,
            digitalID.validUntil
        );
    }

    /**
     * @dev Revoke a digital ID (emergency use)
     * @param _digitalId The digital ID to revoke
     */
    function revokeDigitalID(string memory _digitalId) external onlyOwner {
        require(digitalIDExists(_digitalId), "Digital ID does not exist");
        require(!digitalIDs[_digitalId].isRevoked, "Digital ID already revoked");
        
        digitalIDs[_digitalId].isRevoked = true;
        digitalIDs[_digitalId].isActive = false;
        
        emit DigitalIDRevoked(_digitalId, msg.sender, block.timestamp);
    }

    /**
     * @dev Add an authorized verifier
     * @param _verifier Address to authorize
     */
    function addAuthorizedVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[_verifier] = true;
    }

    /**
     * @dev Remove an authorized verifier
     * @param _verifier Address to remove authorization
     */
    function removeAuthorizedVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
    }

    /**
     * @dev Check if a digital ID exists
     * @param _digitalId The digital ID to check
     * @return exists Whether the ID exists
     */
    function digitalIDExists(string memory _digitalId) public view returns (bool exists) {
        return bytes(digitalIDs[_digitalId].digitalId).length > 0;
    }

    /**
     * @dev Get basic info about a digital ID (public function)
     * @param _digitalId The digital ID to query
     * @return isValid Whether the ID is currently valid
     * @return validUntil Expiry timestamp
     * @return verificationCount Number of verifications
     */
    function getDigitalIDInfo(string memory _digitalId) 
        external 
        view 
        returns (
            bool isValid,
            uint256 validUntil,
            uint256 verificationCount
        ) 
    {
        require(digitalIDExists(_digitalId), "Digital ID does not exist");
        
        DigitalID memory digitalID = digitalIDs[_digitalId];
        
        isValid = digitalID.isActive && 
                 !digitalID.isRevoked && 
                 block.timestamp <= digitalID.validUntil;
        
        return (isValid, digitalID.validUntil, digitalID.verificationCount);
    }

    /**
     * @dev Get all digital IDs for a tourist
     * @param _touristWallet Tourist's wallet address
     * @return digitalIDList Array of digital IDs
     */
    function getTouristDigitalIDs(address _touristWallet) 
        external 
        view 
        returns (string[] memory digitalIDList) 
    {
        return touristToIDs[_touristWallet];
    }

    /**
     * @dev Get contract statistics
     * @return totalIDs Total number of IDs created
     * @return totalVer Total number of verifications
     */
    function getContractStats() 
        external 
        view 
        returns (uint256 totalIDs, uint256 totalVer) 
    {
        return (totalIDsCreated, totalVerifications);
    }
}
