/**
* @type import('hardhat/config').HardhatUserConfig
*/

require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("@nomiclabs/hardhat-waffle");

const { API_URL, PRIVATE_KEY, BASESCAN_API_KEY } = process.env;

module.exports = {
   solidity: "0.8.0",
   defaultNetwork: "hardhat",
   networks: {
      hardhat: {},
      baseSepolia: {
         url: API_URL,
         accounts: [`0x${PRIVATE_KEY}`]
      }
   },
   etherscan: {
      apiKey: {
         baseSepolia: BASESCAN_API_KEY // Use the correct block explorer key for the target network
      }
   },
   sourcify: {
      enabled: true
   }
}
