import { network, ethers } from "hardhat"
import { Addressable } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import { VRFCoordinatorV2_5Mock } from "../typechain-types"
import {
  developmentChains,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat-config"
import { verify } from "../utils/verify"

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30")

const deployRaffle: DeployFunction = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts()
  const { deploy, log, get } = deployments
  const chainId = network.config.chainId!
  const currentNetworkConfig = networkConfig[chainId as keyof typeof networkConfig]

  let vrfCoordinatorV2_5Mock: VRFCoordinatorV2_5Mock | null = null
  let vrfCoordinatorV2_5Address: string | Addressable | undefined = ""
  let subscriptionId: bigint | string | undefined = 0n

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2_5Mock = (await ethers.getContract(
      "VRFCoordinatorV2_5Mock",
    )) as VRFCoordinatorV2_5Mock
    vrfCoordinatorV2_5Address = vrfCoordinatorV2_5Mock.target

    // create a subscription
    const transactionResponse = await vrfCoordinatorV2_5Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    if (transactionReceipt) {
      subscriptionId = BigInt(transactionReceipt.logs[0].topics[1])
      console.log("🚀 ~ module.exports= ~ subscriptionId:", subscriptionId)
      // fund the subscription
      // Usually, you'd need the link token on a real network
      await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    }
  } else if (chainId in networkConfig) {
    vrfCoordinatorV2_5Address = currentNetworkConfig.vrfCoordinatorV2_5
    subscriptionId = currentNetworkConfig.subscriptionId
  }

  const { entranceFee, gasLane, callbackGasLimit, interval, enableNativePayment } =
    currentNetworkConfig

  const waitConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS

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
    waitConfirmations,
  })

  if (developmentChains.includes(network.name)) {
    // Make sure subscriptionId is not undefined before passing it to addConsumer
    if (subscriptionId !== undefined) {
      await vrfCoordinatorV2_5Mock!.addConsumer(subscriptionId, raffle.address)
    }
  }

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(raffle.address, args)
  }

  log("--------------------------------")
}

export default deployRaffle

deployRaffle.tags = ["all", "raffle"]
