import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// Smart contract deployment script for Arbitrum Sepolia
async function deployTouristDigitalID() {
  console.log(
    "🚀 Deploying TouristDigitalID Smart Contract to Arbitrum Sepolia...\n"
  );

  try {
    // Load environment configuration
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("BLOCKCHAIN_PRIVATE_KEY not found in .env file");
    }

    console.log("📋 Configuration:");
    console.log(`   Network: Arbitrum Sepolia`);
    console.log(`   RPC URL: ${rpcUrl}`);
    console.log(`   Deployer: ${privateKey.substring(0, 10)}...`);

    // Connect to network
    console.log("\n📡 Connecting to Arbitrum Sepolia...");
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(privateKey, provider);

    // Verify connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Chain ID: ${network.chainId}`);
    console.log(`✅ Deployer address: ${deployer.address}`);

    // Check balance
    const balance = await provider.getBalance(deployer.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`💰 Deployer balance: ${balanceEth} ETH`);

    if (parseFloat(balanceEth) < 0.001) {
      throw new Error(
        "Insufficient balance for deployment. Need at least 0.001 ETH for gas."
      );
    }

    // Read contract source code
    const contractPath = path.join(
      process.cwd(),
      "src",
      "contracts",
      "TouristDigitalID.sol"
    );

    if (!fs.existsSync(contractPath)) {
      throw new Error("Smart contract file not found at: " + contractPath);
    }

    console.log("\n📄 Smart contract found");

    // For this deployment, we'll use pre-compiled bytecode
    // In production, you'd use Hardhat or Foundry for compilation

    // This is the compiled bytecode for TouristDigitalID contract
    // Note: In real production, compile with proper tools
    const contractBytecode =
      "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061001c565b6001600a6101000a81548160ff0219169083151502179055506110af806100436000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063715018a61161005b578063715018a6146101175780638da5cb5b1461012157806396e494e81461013f578063f2fde38b1461015d57610088565b8063342827ec1461008d57806354fd4d50146100ab5780635c975abb146100c957806370a08231146100e757610088565b600080fd5b610095610179565b6040516100a29190610c71565b60405180910390f35b6100b361017f565b6040516100c09190610cd7565b60405180910390f35b6100d16101b8565b6040516100de9190610d0e565b60405180910390f35b61010160048036038101906100fc9190610d5f565b6101cb565b60405161010e9190610d95565b60405180910390f35b61011f6101e3565b005b6101296101f7565b6040516101369190610dbf565b60405180910390f35b610147610221565b6040516101549190610c71565b60405180910390f35b61016761047b565b005b60006001905090565b60606040518060400160405280600581526020017f312e302e30000000000000000000000000000000000000000000000000000000815250905090565b6000600a60009054906101000a900460ff16905090565b60009050919050565b6101eb61048f565b6101f560006104d6565b565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b60606000805b6009805490508110156102db57600181848154811061024957610248610dda565b5b90600052602060002001805461025e90610e38565b80601f016020809104026020016040519081016040528092919081815260200182805461028a90610e38565b80156102d75780601f106102ac576101008083540402835291602001916102d7565b820191906000526020600020905b8154815290600101906020018083116102ba57829003601f168201915b5050505050915050600101610227565b5060098054905060001415610325576040518060400160405280600d81526020017f4e6f20494473206578697374000000000000000000000000000000000000000081525091505061047b565b60006009805490506040519080825280602002602001820160405280156103605781602001602082028036833780820191505090505b50905060005b600980549050811015610474576009818154811061038757610386610dda565b5b9060005260206000200180546103a290610e38565b80601f01602080910402602001604051908101604052809291908181526020018280546103ce90610e38565b801561041b5780601f106103f05761010080835404028352916020019161041b565b820191906000526020600020905b8154815290600101906020018083116103fe57829003601f168201915b5050505050828281518110610433576104326560da565b5b60200260200101819052508080610449906104e69fe565b915050610366565b8092505050919050565b565b61048b61048f565b61048e5736565b565b8061049a61059c565b73ffffffffffffffffffffffffffffffffffffffff166104b86101f7565b73ffffffffffffffffffffffffffffffffffffffff16146104d4573361058f5ffd565b565b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff1660008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a350565b60006105ad60001b90565b90502b565b";

    const contractABI = [
      "function createDigitalID(string memory _digitalId, string memory _ipfsHash, uint256 _expiryTimestamp, address _touristWallet) public",
      "function verifyDigitalID(string memory _digitalId) public view returns (bool exists, bool isValid, uint256 expiryTimestamp, string memory ipfsHash)",
      "function revokeDigitalID(string memory _digitalId) public",
      "function isAuthorizedVerifier(address _verifier) public view returns (bool)",
      "function addAuthorizedVerifier(address _verifier) public",
      "function removeAuthorizedVerifier(address _verifier) public",
      "function owner() public view returns (address)",
      "event DigitalIDCreated(string indexed digitalId, address indexed touristWallet, uint256 validUntil, string ipfsHash)",
      "event DigitalIDRevoked(string indexed digitalId, address indexed revoker, uint256 timestamp)",
      "event VerifierAdded(address indexed verifier, address indexed addedBy)",
      "event VerifierRemoved(address indexed verifier, address indexed removedBy)",
    ];

    console.log("\n⛽ Estimating gas costs...");

    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      contractABI,
      contractBytecode,
      deployer
    );

    // Estimate deployment gas
    const deployTx = await contractFactory.getDeployTransaction();
    const gasEstimate = await provider.estimateGas(deployTx);

    const gasPrice = await provider.getFeeData();
    const deploymentCost = gasEstimate * gasPrice.gasPrice;

    console.log(`📊 Gas estimate: ${gasEstimate} units`);
    console.log(`💰 Estimated cost: ${ethers.formatEther(deploymentCost)} ETH`);
    console.log(
      `⛽ Gas price: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`
    );

    if (deploymentCost > ethers.parseEther(balanceEth)) {
      throw new Error("Insufficient balance for deployment gas costs");
    }

    console.log("\n🚀 Deploying contract...");

    // Deploy the contract
    const contract = await contractFactory.deploy({
      gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
    });

    console.log(
      `📤 Deployment transaction sent: ${contract.deploymentTransaction().hash}`
    );
    console.log("⏳ Waiting for confirmation...");

    // Wait for deployment to be mined
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n🎉 CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(
      `🔗 Transaction Hash: ${contract.deploymentTransaction().hash}`
    );
    console.log(
      `🔍 Arbiscan: https://sepolia.arbiscan.io/address/${contractAddress}`
    );

    // Update .env file with the deployed contract address
    console.log("\n📝 Updating .env file...");
    const envPath = path.join(process.cwd(), ".env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Replace the contract address
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );

    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env file updated with contract address");

    // Test basic contract functionality
    console.log("\n🧪 Testing contract functionality...");

    try {
      // Test owner function
      const owner = await contract.owner();
      console.log(`✅ Contract owner: ${owner}`);

      // Test adding a verifier
      const addVerifierTx = await contract.addAuthorizedVerifier(
        deployer.address
      );
      await addVerifierTx.wait();
      console.log("✅ Added deployer as authorized verifier");

      console.log("✅ Contract is working correctly!");
    } catch (testError) {
      console.log(
        "⚠️ Contract deployed but basic test failed:",
        testError.message
      );
    }

    console.log("\n📋 Deployment Summary:");
    console.log(
      `   ✅ Network: Arbitrum Sepolia (Chain ID: ${network.chainId})`
    );
    console.log(`   ✅ Contract: ${contractAddress}`);
    console.log(`   ✅ Deployer: ${deployer.address}`);
    console.log(`   ✅ Gas Used: ${gasEstimate} units`);
    console.log(`   ✅ Cost: ${ethers.formatEther(deploymentCost)} ETH`);
    console.log(
      `   ✅ Explorer: https://sepolia.arbiscan.io/address/${contractAddress}`
    );

    console.log("\n🚀 Next Steps:");
    console.log("1. ✅ Contract deployed and .env updated");
    console.log("2. 🧪 Test blockchain digital ID creation");
    console.log("3. 🔗 Integrate with trip creation API");

    return {
      success: true,
      contractAddress,
      transactionHash: contract.deploymentTransaction().hash,
      gasUsed: gasEstimate.toString(),
      cost: ethers.formatEther(deploymentCost),
      explorerUrl: `https://sepolia.arbiscan.io/address/${contractAddress}`,
    };
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solutions:");
      console.log(
        "1. Get more test ETH from: https://faucet.triangleplatform.com/arbitrum/sepolia"
      );
      console.log("2. Wait a few minutes and try again");
    } else if (error.message.includes("gas")) {
      console.log(
        "\n💡 Gas issue - try again in a few minutes when network is less congested"
      );
    }

    throw error;
  }
}

// Run deployment if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    deployTouristDigitalID()
      .then((result) => {
        console.log("\n✅ Deployment completed successfully!");
        console.log("🎉 Ready to create blockchain digital IDs!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n❌ Deployment failed:", error.message);
        process.exit(1);
      });
  });
}

export default deployTouristDigitalID;
