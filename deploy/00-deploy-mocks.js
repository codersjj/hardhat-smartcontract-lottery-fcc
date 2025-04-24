const { network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

// see:
// https://docs.chain.link/vrf/v2-5/subscription/test-locally#deploy-vrfcoordinatorv2_5mock
// https://github.com/smartcontractkit/hardhat-starter-kit/blob/main/test/unit/RandomNumberConsumer.spec.js
const BASE_FEE = ethers.parseEther("0.001") // the base fee
const GAS_PRICE = ethers.parseUnits("50", "gwei") // the gas price (in LINK tokens)
const WEI_PER_UNIT_LINK = ethers.parseEther("0.01") // the current LINK/ETH price

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts()
  const { deploy, log } = deployments
  // const chainId = network.config.chainId
  // console.log(network)

  const args = [BASE_FEE, GAS_PRICE, WEI_PER_UNIT_LINK]

  if (!developmentChains.includes(network.name)) {
    return
  }

  log("Local network detected! Deploying mocks...")
  // deploy a mock VRF Coordinator...
  await deploy("VRFCoordinatorV2_5Mock", {
    from: deployer,
    args,
    log: true,
  })
  log("Mocks deployed!")
  log("----------------------------------------")
}

module.exports.tags = ["all", "mocks"]
