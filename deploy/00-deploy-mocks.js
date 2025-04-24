const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts()
  const { deploy, log } = deployments
  // const chainId = network.config.chainId
  // console.log(network)
  if (!developmentChains.includes(network.name)) {
    return
  }

  log("Local network detected! Deploying mocks...")
  // deploy a mock VRF Coordinator...
}
