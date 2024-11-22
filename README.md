# calendar-smart-contract
> Solidity Smart Contract Template for Decentralized Meeting Scheduling and Management on Blockchain

👉 **STAR ⭐ this project for later use and to keep posted on the changes.**

## Table of Contents
- Calendar Smart Contract
    - [Table of Contents](#table-of-contents)
    - [General Information](#general-information)
    - [Features](#features)
    - [Function's](#functions)
    - [Technologies and Techniques](#technologies-and-techniques)
        - [Project configuration](#project-configuration)
        - [Main application](#main-application)
  - [Setup](#setup)

## General Information
- This project was created to fulfill the need many developers face when building decentralized applications with on-chain meeting management functionality.  
- It provides a Solidity smart contract template to create, manage, and track meetings, ensuring transparency and immutability on the blockchain.
- It simplifies the implementation of features like meeting creation, rescheduling, participant management, and availability checks, serving as a foundation for your blockchain-based scheduling applications.

## Features
- Create a Meeting: Allows an organizer to create a meeting with participants, date, time, agenda, and link ✔
- Reschedule a Meeting: Organizer can reschedule the meeting by changing the date and time ✔
- Add Participants: Organizer can add participants to an existing meeting ✔
- Cancel a Meeting: Organizer can cancel the meeting ✔
- Check Meetings by Address: Retrieve all meetings for which a user is an organizer or participant ✔
- Check Availability: Checks if an address is available for a given date and time ✔

## Function's
### `createMeeting`
- **Purpose**: Allows an organizer to create a new meeting.
- **Parameters**:
  - `participants`: List of participants' addresses.
  - `date`: UNIX timestamp for the meeting date.
  - `startTime`: Start time of the meeting in seconds from midnight.
  - `endTime`: End time of the meeting in seconds from midnight.
  - `agenda`: A brief agenda of the meeting.
  - `meetLink`: Link to the meeting (e.g., Zoom/Google Meet link).
- **Details**:
  - Creates a new meeting and tracks it under the organizer and participants' addresses.
  - Emits the `MeetingCreated` event.

### `rescheduleMeeting`
- **Purpose**: Enables the organizer to reschedule an existing meeting.
- **Parameters**:
  - `meetingId`: ID of the meeting to be rescheduled.
  - `newDate`: New date for the meeting.
  - `newStartTime`: New start time of the meeting.
  - `newEndTime`: New end time of the meeting.
- **Details**:
  - Updates the date and time of the specified meeting.
  - Emits the `MeetingRescheduled` event.

### `addParticipants`
- **Purpose**: Allows the organizer to add new participants to an existing meeting.
- **Parameters**:
  - `meetingId`: ID of the meeting.
  - `newParticipants`: List of new participants' addresses.
- **Details**:
  - Adds only non-duplicate participants to the meeting.
  - Tracks the meeting under the new participants' addresses.
  - Emits the `ParticipantAdded` event for each added participant.

### `cancelMeeting`
- **Purpose**: Lets the organizer cancel an existing meeting.
- **Parameters**:
  - `meetingId`: ID of the meeting to be canceled.
- **Details**:
  - Marks the meeting as canceled.
  - Emits the `MeetingCancelled` event.

### `getMeetingDetails`
- **Purpose**: Retrieves detailed information about a specific meeting by its `meetingId`.
- **Parameters**:
  - `meetingId`: The unique identifier of the meeting to retrieve details for.
- **Details**:
  - A `MeetingDetails` object with the following fields:
  - `organizer`: Address of the meeting organizer.  
  - `date`: Meeting date (UNIX timestamp).  
  - `startTime`: Meeting start time (in seconds from midnight).  
  - `endTime`: Meeting end time (in seconds from midnight).  
  - `agenda`: The agenda of the meeting.  
  - `meetLink`: Link to the meeting.  
  - `isCancelled`: Boolean indicating if the meeting is cancelled.  
  - `participants`: Array of addresses representing participants in the meeting.  

### `addMeetingToUser`
- **Purpose**: Associates a meeting with a user's address.
- **Parameters**:
  - `user`: Address of the user.
  - `meetingId`: ID of the meeting.
- **Details**:
  - Ensures no duplicate meetings are added to the user's list.

## Technologies and Techniques

### Project configuration
<div style="margin-left: 3rem;" >

```
📦src
 ┣ 📂contracts  => Contains contract
 ┣ 📂scripts  => Scripts to deploy the contract.
 ┣ 📂test  => Tests of the contract.
 ┣ 📂hardhat.config.js  => Network details.
``` 
</div>

### Main application
- Contract deployed here: [Calendar](https://sepolia.basescan.org/address/0xC2dE2fcD871eacb8147A1FB4a6036726b1e094f0)
- This project was implemented 100% with Solidity for smart contract development.
- Smart contract deployment and testing were carried out using the [Hardhat](https://hardhat.org/) framework, which provides a robust environment for building and deploying Ethereum-based applications.
- The project leverages JavaScript for script automation and interaction with the deployed contracts.
- [Base Sepolia Explorer](https://sepolia.basescan.org/) was used for contract verification and exploring the deployed contract.
- Doc's Referred
    - https://www.web3.university/tracks/create-a-smart-contract/deploy-your-first-smart-contract
    - https://hardhat.org/hardhat-runner/docs/guides/verifying

## Setup
1. Clone this project by doing:
```
$ git clone https://github.com/sarvesh371/calendar-smart-contract.git
```
2. Go to the folder you've just cloned the code and execute:
```
$ npm install
```
3. Create a ```.env``` file in your project's container folder. The file should have the following variables with your own values:
```
API_URL="ALCHEMY_API_URL"
PRIVATE_KEY="METAMASK_PRIVATE_KEY"
BASESCAN_API_KEY="BASESCAN_API_KEY"
```
4. Compile the contract
```
$ npx hardhat compile
```
5. Deploy the contract
```
$ npx hardhat run scripts/deploy.js --network baseSepolia
```
6. Verify the contract
```
$ npx hardhat verify --network baseSepolia <DEPLOYED_CONTRACT_ADDRESS>
```
7. Run tests on hardhat local
```
$ npx hardhat test
```
8. Run tests on Base Sepolia
```
$ npx hardhat test --network baseSepolia
```
