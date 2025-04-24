const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts()
  const { deploy, log, get } = deployments
  let vrfCoordinatorV2_5Address = null

  if (developmentChains.includes(network.name)) {
    // const vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
    const vrfCoordinatorV2_5Mock = await get("VRFCoordinatorV2_5Mock")
    vrfCoordinatorV2_5Address = vrfCoordinatorV2_5Mock.address
  }

  const args = [vrfCoordinatorV2_5Address]

  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })
}
