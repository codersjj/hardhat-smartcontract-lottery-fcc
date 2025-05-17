const fs = require("fs")
const { ethers } = require("hardhat")
const path = require("path")

const FRONT_END_CONTRACT_ADDRESSES_FILE_PATH =
  "../nextjs-smartcontract-lottery-fcc/app/constants/contractAddresses.json"
const FRONT_END_ABI_FILE_PATH = "../nextjs-smartcontract-lottery-fcc/app/constants/abi.json"
const FRONT_END_CONTRACTS_FILE_PATH =
  "../nextjs-smartcontract-lottery-fcc/app/constants/contracts.ts"
async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle")
  const chainId = network.config.chainId

  // Create directory if it doesn't exist
  const dirPath = path.dirname(FRONT_END_CONTRACT_ADDRESSES_FILE_PATH)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }

  let contractAddresses = {}
  if (fs.existsSync(FRONT_END_CONTRACT_ADDRESSES_FILE_PATH)) {
    contractAddresses = JSON.parse(fs.readFileSync(FRONT_END_CONTRACT_ADDRESSES_FILE_PATH, "utf8"))
  }
  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId].includes(raffle.target)) {
      contractAddresses[chainId].push(raffle.target)
    }
  } else {
    contractAddresses[chainId] = [raffle.target]
  }
  fs.writeFileSync(FRONT_END_CONTRACT_ADDRESSES_FILE_PATH, JSON.stringify(contractAddresses))
  console.log("Contract addresses updated")
}

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle")
  const dirPath = path.dirname(FRONT_END_ABI_FILE_PATH)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  fs.writeFileSync(FRONT_END_ABI_FILE_PATH, raffle.interface.formatJson())
  console.log("Abi updated")
}

async function updateContracts() {
  const contractAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_CONTRACT_ADDRESSES_FILE_PATH, "utf8"),
  )
  const abi = JSON.parse(fs.readFileSync(FRONT_END_ABI_FILE_PATH, "utf8"))
  const contractInfo = {
    address: {
      [network.config.chainId]: contractAddresses[network.config.chainId][0],
    },
    abi,
  }
  fs.writeFileSync(
    FRONT_END_CONTRACTS_FILE_PATH,
    `export const raffleContractConfig = ${JSON.stringify(contractInfo)} as const`,
  )
  console.log("Contract info updated")
}

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...")
    await updateContractAddresses()
    await updateAbi()
    await updateContracts()
    console.log("updated")
  }
}
