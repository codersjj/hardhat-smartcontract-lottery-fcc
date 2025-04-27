import { ethers } from "hardhat"

export interface networkConfigItem {
  name?: string
  subscriptionId?: string
  gasLane?: string
  interval?: string
  entranceFee?: string | bigint
  callbackGasLimit?: string
  vrfCoordinatorV2_5?: string
  enableNativePayment?: boolean
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem
}

const networkConfig: networkConfigInfo = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2_5: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    entranceFee: ethers.parseEther("0.01"),
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    subscriptionId: "2285852935276885187536834546937285128228667036727270462860326086981248659160",
    callbackGasLimit: "100000",
    interval: "30",
    enableNativePayment: false,
  },
  31337: {
    name: "hardhat",
    entranceFee: ethers.parseEther("0.01"),
    gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: "100000",
    interval: "30",
    enableNativePayment: false,
  },
}

const developmentChains = ["hardhat", "localhost"]

const VERIFICATION_BLOCK_CONFIRMATIONS = 6

export { networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS }
