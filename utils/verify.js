const { run } = require("hardhat")

const verify = async (contractAddress, args) => {
  console.log(`Verifying contract ${contractAddress}...`)
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    })
  } catch (error) {
    console.log("Error verifying contract", error)
  }
}

module.exports = {
  verify,
}
