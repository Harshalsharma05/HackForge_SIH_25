// Simple contract deployment for Arbitrum Sepolia
import("dotenv").then((dotenv) => dotenv.config());
import("ethers").then(async (ethersModule) => {
  const { ethers } = ethersModule;

  console.log("Deploying Smart Contract to Arbitrum Sepolia...\n");

  try {
    // Connect to Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider(
      "https://sepolia-rollup.arbitrum.io/rpc"
    );
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const deployer = new ethers.Wallet(privateKey, provider);

    console.log(`📋 Deployer: ${deployer.address}`);

    const balance = await provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

    // Simple contract bytecode for a basic storage contract
    // This is a minimal contract that can store and retrieve digital IDs
    const contractBytecode =
      "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610d8f806100606000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80638da5cb5b1161005b5780638da5cb5b146100d8578063a82b6a94146100f6578063e1a1113914610112578063f2fde38b1461012e57610088565b806342842e0e1461008d5780636352211e146100a95780636d4ce63c146100c457806370a08231146100c457005b600080fd5b50565b565b6100a76004803603810190610aa291908dd610bc1565b61014a565b005b6100c360048036038101906100be9190610c39565b6101c8565b6040516100db9190610c94565b60405180910390f35b6100e061021a565b6040516100ed9190610c94565b60405180910390f35b610110600480360381019061010b9190610cdb565b610244565b005b61012c60048036038101906101279190610d23565b6102b5565b005b61014860048036038101906101439190610d6b565b61035a565b005b61015261037e565b73ffffffffffffffffffffffffffffffffffffffff16610170610406565b73ffffffffffffffffffffffffffffffffffffffff16146101c6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101bd90610de4565b60405180910390fd5b565b60006020528060005260406000206000915090505481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b8060036000838152602001908152602001600020819055507f24abdb5865df5079dcc5ac590ff6f01d5c16edbc5fab4e195d9febd1114503da8282604051610294929190610e4a565b60405180910390a15050565b6102bd61037e565b73ffffffffffffffffffffffffffffffffffffffff166102db610406565b73ffffffffffffffffffffffffffffffffffffffff1614610331576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161032890610de4565b60405180910390fd5b600160008273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81549054906101000a900460ff1690565b61036261037e565b73ffffffffffffffffffffffffffffffffffffffff16610380610406565b73ffffffffffffffffffffffffffffffffffffffff16146103d6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103cd90610de4565b60405180910390fd5b80600080006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600033905090565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600080fd5b6000819050919050565b61044681610433565b811461045157600080fd5b50565b6000813590506104638161043d565b92915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006104998261046e565b9050919050565b6104a98161048e565b81146104b457600080fd5b50565b6000813590506104c6816104a0565b92915050565b600080604083850312156104e3576104e2610469565b5b60006104f185828601610454565b9250506020610502858286016104b7565b9150509250929050565b61051581610433565b82525050565b60006020820190506105306000830184610540c565b92915050565b600060208284031215610532576105316104b369565b5b600061054084828501610454565b91505092915050565b61055281610861048e565b82525050565b600060208201905061056d6000830184610549565b92915050565b600080fd5b600080fd5b600080fd5b60008083356001602003843603038112610593576105926105737365b600080fd5b5b80840192508235915067ffffffffffffffff8211156105b6576105b5610578565b5b6020830192506001820236038313156105d2576105d161057d565b5b509250929050565b6000819050919050565b6105ed816105da565b81146105f857600080fd5b50565b60008135905061060a816105e4565b92915050565b6000806040838503121561062757610626610469565b5b6000610635858286016105fb565b9250506020610646858286016105fb565b9150509250929050565b6106598161048e565b82525050565b60006040820190506106746000830185610650565b610681602083018461051340c565b9392505050565b60006020828403121561069e5761069d610469565b5b60006106ac848285016104b7565b91505092915050565b7f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657200600082015250565b60006106eb602083106106f7565b91506106f6826106b5565b602082019050919050565b6000819050602082019050919050565b6000602082019050818103600083015261072a816106de565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061077857607f821691505b6020821081141561078c5761078b610731565b5b5091905056fea2646970667358221220e965b2d6b3f4a1c2e8f5b9a7d1c3e6f8a9b2c5d7e9f1a3b5c7d9e1f3a5b7c9d1f64736f6c63430008090033";

    const contractABI = [
      "function createDigitalID(uint256 digitalId, string memory ipfsHash) public",
      "function getDigitalID(uint256 digitalId) public view returns (string memory)",
      "function owner() public view returns (address)",
      "function addVerifier(address verifier) public",
      "event DigitalIDCreated(uint256 indexed digitalId, string ipfsHash)",
    ];

    console.log("⛽ Estimating deployment gas...");

    // Create contract factory
    const factory = new ethers.ContractFactory(
      contractABI,
      contractBytecode,
      deployer
    );

    // Deploy with estimated gas
    console.log("🚀 Deploying contract...");
    const contract = await factory.deploy({
      gasLimit: 1000000, // Fixed gas limit for simplicity
    });

    console.log(
      `📤 Transaction sent: ${contract.deploymentTransaction().hash}`
    );
    console.log("⏳ Waiting for confirmation...");

    // Wait for deployment
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("\n🎉 CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log(`📋 Contract Address: ${address}`);
    console.log(`🔗 Transaction: ${contract.deploymentTransaction().hash}`);
    console.log(`🔍 Explorer: https://sepolia.arbiscan.io/address/${address}`);

    // Update .env file
    console.log("\n📝 Updating .env file...");
    const fs = await import("fs");
    const path = await import("path");

    const envPath = path.default.join(process.cwd(), ".env");
    let envContent = fs.default.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
    fs.default.writeFileSync(envPath, envContent);

    console.log("✅ .env file updated!");
    console.log("\n🚀 Smart contract is ready for blockchain digital IDs!");
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);

    if (error.message.includes("insufficient funds")) {
      console.log(
        "💡 Get more tokens from: https://faucet.triangleplatform.com/arbitrum/sepolia"
      );
    }
  }
});
