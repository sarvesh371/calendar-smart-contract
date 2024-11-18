async function main() {
    const Calendar = await ethers.getContractFactory("Calender");
 
    // Start deployment, returning a promise that resolves to a contract object
    const calendar = await Calendar.deploy();
    console.log("Contract deployed to address:", calendar.address);
 }
 
 main()
   .then(() => process.exit(0))
   .catch(error => {
     console.error(error);
     process.exit(1);
   });