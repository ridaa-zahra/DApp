import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";

const { ethers } = await network.connect();

function readGenerated() {
  const p = path.resolve("..", "crowdfunding-dapp", "src", "contracts.generated.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

const generated = readGenerated();
const kycAddress = generated.addresses.KYC;

console.log("KYCRegistry_RidaZahra:", kycAddress);
const code = await ethers.provider.getCode(kycAddress);
if (!code || code === "0x") {
  console.log("ERROR: No contract code at this address on your current localhost chain.");
  console.log("Fix: keep `npx hardhat node` running, then redeploy:");
  console.log("  npx hardhat run scripts/deploy.js --network localhost");
  process.exit(2);
}

const kyc = await ethers.getContractAt("KYCRegistry_RidaZahra", kycAddress);

const admin = await kyc.admin();
console.log("admin:", admin);

const [addrs, names, cnics] = await kyc.getPendingRequests();
console.log("pending_count:", addrs.length);
for (let i = 0; i < addrs.length; i++) {
  console.log("-", addrs[i], "|", names[i], "|", cnics[i]);
}

