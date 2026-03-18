import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

console.log("Starting deployment...");

const { ethers } = await network.connect();

console.log("Deploying KYCRegistry_RidaZahra...");
const kyc = await ethers.deployContract("KYCRegistry_RidaZahra");
await kyc.waitForDeployment();
const kycAddress = await kyc.getAddress();
console.log("✅ KYCRegistry deployed to:", kycAddress);

console.log("Deploying Crowdfunding_RidaZahra...");
const cf = await ethers.deployContract("Crowdfunding_RidaZahra", [kycAddress]);
await cf.waitForDeployment();
const cfAddress = await cf.getAddress();
console.log("✅ Crowdfunding deployed to:", cfAddress);

// Write addresses + ABIs for the React frontend
const artifactDir = path.resolve("artifacts", "contracts");
const kycArtifact = JSON.parse(
  fs.readFileSync(path.join(artifactDir, "KYCRegistry_RidaZahra.sol", "KYCRegistry_RidaZahra.json"), "utf8")
);
const cfArtifact = JSON.parse(
  fs.readFileSync(path.join(artifactDir, "Crowdfunding_RidaZahra.sol", "Crowdfunding_RidaZahra.json"), "utf8")
);

const out = {
  addresses: {
    KYC: kycAddress,
    CROWDFUNDING: cfAddress,
  },
  abi: {
    KYC: kycArtifact.abi,
    CROWDFUNDING: cfArtifact.abi,
  },
};

const frontendOutPath = path.resolve("..", "crowdfunding-dapp", "src", "contracts.generated.json");
fs.writeFileSync(frontendOutPath, JSON.stringify(out, null, 2));
console.log("📝 Frontend contracts written to:", frontendOutPath);

console.log("\nDeployment complete.");