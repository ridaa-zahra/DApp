import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatEthersPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    ...(process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY
      ? {
          sepolia: {
            type: "http",
            chainType: "l1",
            url: process.env.SEPOLIA_RPC_URL,
            accounts: [process.env.SEPOLIA_PRIVATE_KEY],
          },
        }
      : {}),
  },
});