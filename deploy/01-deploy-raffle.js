const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts()
  const { deploy, log, get } = deployments
  const chainId = network.config.chainId
  const currentNetworkConfig = networkConfig[chainId]

  let vrfCoordinatorV2_5Address = null
  let subscriptionId = null

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
    vrfCoordinatorV2_5Address = vrfCoordinatorV2_5Mock.target

    // create a subscription
    const transactionResponse = await vrfCoordinatorV2_5Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subscriptionId = BigInt(transactionReceipt.logs[0].topics[1])
    console.log("🚀 ~ module.exports= ~ subscriptionId:", subscriptionId)
    // fund the subscription
    // Usually, you'd need the link token on a real network
    await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
  } else if (chainId in networkConfig) {
    vrfCoordinatorV2_5Address = currentNetworkConfig.vrfCoordinatorV2_5
    subscriptionId = currentNetworkConfig.subscriptionId
  }

  const { entranceFee, gasLane, callbackGasLimit, interval, enableNativePayment } =
    currentNetworkConfig

  const args = [
    vrfCoordinatorV2_5Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
    enableNativePayment,
  ]

  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(raffle.address, args)
  }

  log("--------------------------------")
}

module.exports.tags = ["all", "raffle"]
