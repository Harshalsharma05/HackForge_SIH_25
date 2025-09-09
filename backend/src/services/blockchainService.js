import { ethers } from "ethers";
import crypto from "crypto";
import { create } from "ipfs-http-client";

// Smart contract ABI (will be updated after deployment)
const CONTRACT_ABI = [
  // This will be populated after contract compilation
  // For now, we'll use a simplified ABI
  "function createDigitalID(string _digitalId, address _touristWallet, string _ipfsHash, uint256 _validUntil) external",
  "function verifyDigitalID(string _digitalId) external returns (bool, address, string, uint256)",
  "function getDigitalIDInfo(string _digitalId) external view returns (bool, uint256, uint256)",
  "function digitalIDExists(string _digitalId) public view returns (bool)",
  "event DigitalIDCreated(string indexed digitalId, address indexed touristWallet, uint256 validUntil, string ipfsHash)",
];

class BlockchainService {
  constructor() {
    // Initialize provider with fallback options for multiple networks
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc.sepolia.org";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Detect network type from RPC URL
    this.networkType = this.detectNetworkType(rpcUrl);

    // Initialize wallet (system wallet for creating IDs)
    this.systemWallet = new ethers.Wallet(
      process.env.BLOCKCHAIN_PRIVATE_KEY,
      this.provider
    );

    // Initialize smart contract
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      this.systemWallet
    );

    // Initialize IPFS client
    this.ipfs = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
        ).toString("base64")}`,
      },
    });

    console.log("🔗 Blockchain Service initialized");
    console.log(
      `📡 Network: ${
        process.env.NODE_ENV === "production"
          ? "Ethereum Mainnet"
          : this.getNetworkDisplayName()
      }`
    );
    console.log(`🏠 Contract: ${process.env.CONTRACT_ADDRESS}`);
  }

  /**
   * Get display name for current network
   * @returns {string} Network display name
   */
  getNetworkDisplayName() {
    switch (this.networkType) {
      case "base":
        return "Base Sepolia";
      case "sepolia":
        return "Ethereum Sepolia";
      case "polygon":
        return "Polygon Amoy";
      case "arbitrum":
        return "Arbitrum Sepolia";
      default:
        return "Unknown Network";
    }
  }

  /**
   * Detect network type from RPC URL
   * @param {string} rpcUrl - RPC URL to analyze
   * @returns {string} Network type
   */
  detectNetworkType(rpcUrl) {
    if (rpcUrl.includes("sepolia")) return "sepolia";
    if (rpcUrl.includes("polygon") || rpcUrl.includes("mumbai"))
      return "polygon";
    if (rpcUrl.includes("base")) return "base";
    if (rpcUrl.includes("arbitrum")) return "arbitrum";
    if (rpcUrl.includes("mainnet")) return "mainnet";
    return "unknown";
  }

  /**
   * Generate a unique wallet for a tourist
   * @returns {Object} Wallet address and encrypted private key
   */
  generateTouristWallet() {
    const wallet = ethers.Wallet.createRandom();

    // Encrypt private key with system password using modern crypto
    const encryptionKey =
      process.env.WALLET_ENCRYPTION_KEY || "default-encryption-key";
    const algorithm = "aes-256-cbc";
    const iv = crypto.randomBytes(16);

    // Create a 32-byte key from the encryption key
    const key = crypto.createHash("sha256").update(encryptionKey).digest();

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encryptedPrivateKey = cipher.update(wallet.privateKey, "utf8", "hex");
    encryptedPrivateKey += cipher.final("hex");

    // Prepend IV to encrypted data
    const encryptedWithIv = iv.toString("hex") + ":" + encryptedPrivateKey;

    return {
      address: wallet.address,
      privateKeyEncrypted: encryptedWithIv,
      mnemonic: wallet.mnemonic.phrase, // Store securely, used for recovery
    };
  }

  /**
   * Decrypt a tourist's private key
   * @param {string} encryptedPrivateKey - Encrypted private key
   * @returns {string} Decrypted private key
   */
  decryptPrivateKey(encryptedPrivateKey) {
    const encryptionKey =
      process.env.WALLET_ENCRYPTION_KEY || "default-encryption-key";
    const algorithm = "aes-256-cbc";

    // Create a 32-byte key from the encryption key
    const key = crypto.createHash("sha256").update(encryptionKey).digest();

    // Split IV and encrypted data
    const parts = encryptedPrivateKey.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decryptedPrivateKey = decipher.update(encrypted, "hex", "utf8");
    decryptedPrivateKey += decipher.final("utf8");
    return decryptedPrivateKey;
  }

  /**
   * Encrypt sensitive data for IPFS storage
   * @param {Object} data - Data to encrypt
   * @param {string} encryptionKey - Encryption key
   * @returns {string} Encrypted data
   */
  encryptData(data, encryptionKey) {
    const algorithm = "aes-256-cbc";
    const iv = crypto.randomBytes(16);

    // Create a 32-byte key from the encryption key
    const key = crypto.createHash("sha256").update(encryptionKey).digest();

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    // Prepend IV to encrypted data
    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Upload encrypted metadata to IPFS
   * @param {Object} metadata - Tourist and trip metadata
   * @param {string} encryptionKey - Encryption key
   * @returns {string} IPFS hash
   */
  async uploadToIPFS(metadata, encryptionKey) {
    try {
      // Encrypt the metadata
      const encryptedData = this.encryptData(metadata, encryptionKey);

      // Create metadata object with encryption info
      const ipfsData = {
        encrypted: true,
        data: encryptedData,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Upload to IPFS
      const result = await this.ipfs.add(JSON.stringify(ipfsData));
      console.log(`📦 Data uploaded to IPFS: ${result.path}`);
      return result.path;
    } catch (error) {
      console.error("❌ IPFS upload failed:", error);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Generate a unique smart contract ID
   * @returns {string} Unique ID for smart contract
   */
  generateSmartContractId() {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(8).toString("hex");
    return `TID_${timestamp}_${randomBytes}`.toUpperCase();
  }

  /**
   * Create a blockchain digital ID
   * @param {Object} params - Parameters for digital ID creation
   * @returns {Object} Transaction result and metadata
   */
  async createBlockchainDigitalID({
    digital_id,
    tourist_id,
    tourist_data,
    trip_data,
  }) {
    try {
      console.log("🔨 Creating blockchain digital ID...");

      // Generate unique smart contract ID
      const smartContractId = digital_id || this.generateSmartContractId();

      // Generate encryption key for this ID
      const encryptionKey = crypto.randomBytes(32).toString("hex");

      // Calculate validUntil timestamp from trip end date
      const validUntil = new Date(trip_data.end_date);

      // Prepare metadata for IPFS
      const metadata = {
        tourist: {
          id: tourist_id,
          name: tourist_data.name,
          nationality: tourist_data.nationality,
          kycVerified: tourist_data.kyc_verified || false,
          email: tourist_data.email,
          phone: tourist_data.phone,
        },
        trip: {
          name: trip_data.trip_name,
          destination: trip_data.destination,
          startDate: trip_data.start_date,
          endDate: trip_data.end_date,
          purpose: trip_data.purpose,
        },
        security: {
          digitalId: smartContractId,
          createdAt: new Date().toISOString(),
          validUntil: validUntil.toISOString(),
        },
      };

      // Upload metadata to IPFS (simplified for now)
      let ipfsHash = "QmTestIPFSHash" + Date.now(); // Mock IPFS hash for testing

      try {
        ipfsHash = await this.uploadToIPFS(metadata, encryptionKey);
      } catch (ipfsError) {
        console.log(
          "⚠️ IPFS upload failed, using mock hash:",
          ipfsError.message
        );
      }

      // Generate a tourist wallet for this digital ID
      const touristWallet = this.generateTouristWallet();

      // Convert end date to Unix timestamp
      const validUntilTimestamp = Math.floor(
        new Date(trip_data.end_date).getTime() / 1000
      );

      // For now, skip the smart contract call and return mock data for testing
      // TODO: Implement actual smart contract interaction
      console.log("⚠️ Using mock blockchain transaction for testing");

      const mockTxHash = "0x" + crypto.randomBytes(32).toString("hex");
      const mockBlockNumber = Math.floor(Math.random() * 1000000);

      // Return all the data needed for database storage
      return {
        success: true,
        txHash: mockTxHash,
        contractId: smartContractId,
        blockNumber: mockBlockNumber,
        gasUsed: "21000",
        ipfsHash,
        walletAddress: touristWallet.address,
        encryptedPrivateKey: touristWallet.privateKeyEncrypted,
        verificationUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/api/v1/trips/verify/${smartContractId}`,
        network: "arbitrum-sepolia",
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Blockchain digital ID creation failed:", error);
      throw new Error(`Blockchain creation failed: ${error.message}`);
    }
  }

  /**
   * Verify a digital ID on the blockchain
   * @param {string} smartContractId - Smart contract ID to verify
   * @returns {Object} Verification result
   */
  async verifyDigitalID(smartContractId) {
    try {
      console.log(`🔍 Verifying digital ID: ${smartContractId}`);

      // Check if ID exists and get basic info
      const [isValid, validUntil, verificationCount] =
        await this.contract.getDigitalIDInfo(smartContractId);

      if (!isValid) {
        return {
          isValid: false,
          reason: "Digital ID is expired, revoked, or does not exist",
        };
      }

      return {
        isValid: true,
        validUntil: new Date(validUntil * 1000), // Convert from Unix timestamp
        verificationCount: verificationCount.toString(),
        verifiedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ Digital ID verification failed:", error);
      return {
        isValid: false,
        reason: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Get metadata from IPFS and decrypt it
   * @param {string} ipfsHash - IPFS hash
   * @param {string} encryptionKey - Decryption key
   * @returns {Object} Decrypted metadata
   */
  async getMetadataFromIPFS(ipfsHash, encryptionKey) {
    try {
      // Fetch from IPFS
      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      const ipfsData = JSON.parse(data);

      // Decrypt the data
      if (ipfsData.encrypted) {
        const algorithm = "aes-256-cbc";

        // Create a 32-byte key from the encryption key
        const key = crypto.createHash("sha256").update(encryptionKey).digest();

        // Split IV and encrypted data
        const parts = ipfsData.data.split(":");
        const iv = Buffer.from(parts[0], "hex");
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return JSON.parse(decrypted);
      } else {
        return ipfsData;
      }
    } catch (error) {
      console.error("❌ IPFS metadata retrieval failed:", error);
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Check blockchain connection status
   * @returns {Object} Connection status
   */
  async getConnectionStatus() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const balance = await this.provider.getBalance(this.systemWallet.address);

      return {
        connected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        systemWalletBalance: ethers.formatEther(balance),
        contractAddress: process.env.CONTRACT_ADDRESS,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Get network status and statistics
   * @returns {Object} Network status
   */
  async getNetworkStatus() {
    try {
      const connectionStatus = await this.getConnectionStatus();

      if (!connectionStatus.connected) {
        return connectionStatus;
      }

      // Get gas price
      const gasPrice = await this.provider.getFeeData();

      // Get contract status
      let contractStatus = "unknown";
      try {
        const contractCode = await this.provider.getCode(
          process.env.CONTRACT_ADDRESS
        );
        contractStatus = contractCode !== "0x" ? "deployed" : "not_deployed";
      } catch {
        contractStatus = "error";
      }

      return {
        ...connectionStatus,
        gasPrice: {
          gasPrice: gasPrice.gasPrice
            ? ethers.formatUnits(gasPrice.gasPrice, "gwei")
            : null,
          maxFeePerGas: gasPrice.maxFeePerGas
            ? ethers.formatUnits(gasPrice.maxFeePerGas, "gwei")
            : null,
          maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
            ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, "gwei")
            : null,
        },
        contractStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export class for creating instances
export default BlockchainService;
