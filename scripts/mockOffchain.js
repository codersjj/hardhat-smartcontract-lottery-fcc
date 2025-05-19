const { ethers, network } = require("hardhat")

async function mockKeepers() {
  const raffle = await ethers.getContract("Raffle")
  const checkData = ethers.keccak256(ethers.toUtf8Bytes(""))
  const { upkeepNeeded } = await raffle.checkUpkeep(checkData)

  if (upkeepNeeded) {
    console.log("Upkeep needed")
    const tx = await raffle.performUpkeep(checkData)
    const txReceipt = await tx.wait(1)
    const requestId = txReceipt.logs[1].args[0]

    // wait for the upkeep to be performed just for frontend display purposes, then we can see Raffle state is changed in the UI
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log(`Performed upkeep with requestId: ${requestId}`)
    if (network.config.chainId === 31337) {
      await mockVrf(requestId, raffle)
    }
  } else {
    console.log("No upkeep needed!")
  }
}

async function mockVrf(requestId, raffle) {
  console.log("raffle.target", raffle.target)
  console.log("We on a local network? Ok let's pretend...")
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
  await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.target)
  console.log("Responded!")
  const recentWinner = await raffle.getRecentWinner()
  console.log(`The winner is ${recentWinner}`)
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
