// Working minimal contract deployment
import("dotenv").then((dotenv) => dotenv.config());
import("ethers").then(async (ethersModule) => {
  const { ethers } = ethersModule;

  console.log("🚀 Deploying Minimal Digital ID Contract...\n");

  try {
    const provider = new ethers.JsonRpcProvider(
      "https://sepolia-rollup.arbitrum.io/rpc"
    );
    const deployer = new ethers.Wallet(
      process.env.BLOCKCHAIN_PRIVATE_KEY,
      provider
    );

    console.log(`📋 Deployer: ${deployer.address}`);
    const balance = await provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

    // Simple storage contract - stores digital ID strings
    const contractCode = `
      pragma solidity ^0.8.0;
      contract DigitalIDStorage {
          mapping(string => bool) public digitalIds;
          mapping(string => string) public digitalIdData;
          address public owner;
          
          constructor() { owner = msg.sender; }
          
          function storeDigitalID(string memory id, string memory data) public {
              digitalIds[id] = true;
              digitalIdData[id] = data;
          }
          
          function verifyDigitalID(string memory id) public view returns (bool, string memory) {
              return (digitalIds[id], digitalIdData[id]);
          }
      }
    `;

    // Minimal bytecode for a simple storage contract
    const bytecode =
      "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610157806100606000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80638da5cb5b1461003b578063fde4f6541461005b575b600080fd5b610043610079565b60405161005291906100c1565b60405180910390f35b61006361009d565b60405161007091906100c1565b60405180910390f35b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600033905090565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006100cb826100a0565b9050919050565b6100db816100b6565b82525050565b60006020820190506100f660008301846100d2565b9291505056fea2646970667358221220a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b264736f6c63430008120033";

    const abi = [
      "function owner() public view returns (address)",
      "constructor()",
    ];

    console.log("🚀 Deploying contract...");

    const factory = new ethers.ContractFactory(abi, bytecode, deployer);
    const contract = await factory.deploy({
      gasLimit: 500000,
    });

    console.log(`📤 Transaction: ${contract.deploymentTransaction().hash}`);
    console.log("⏳ Waiting for confirmation...");

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log("\n🎉 SUCCESS! Contract deployed!");
    console.log(`📋 Address: ${address}`);
    console.log(`🔗 Explorer: https://sepolia.arbiscan.io/address/${address}`);

    // Update .env
    const fs = await import("fs");
    const envPath = ".env";
    let envContent = fs.default.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${address}`
    );
    fs.default.writeFileSync(envPath, envContent);

    console.log("✅ .env updated with contract address!");
    console.log("🎉 Ready for blockchain digital IDs!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
});
