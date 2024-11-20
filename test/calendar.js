const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("calender Management", function () {
    let Calender, calender, owner, addr1, addr2;

    beforeEach(async function () {
        // Setup the signers and deploy the contract before each test
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        Calender = await ethers.getContractFactory("Calender");
        calender = await Calender.deploy();
        await calender.deployed();
    });

    describe("Create Meeting", function () {

        it("Should create a meeting successfully", async function () {
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
            const agenda = "Project Discussion";
            const meetLink = "https://example.com/meeting";

            // Call createMeeting function
            await expect(
            calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink)
            )
            .to.emit(calender, "MeetingCreated") // Expect the MeetingCreated event to be emitted
            .withArgs(1, owner.address); // Expect the meeting ID and organizer address

            // Check that the meeting was created for the organizer
            const meetings = await calender.getMeetingsByAddress(owner.address);
            expect(meetings.length).to.equal(1);
            expect(meetings[0].agenda).to.equal(agenda);
            expect(meetings[0].meetLink).to.equal(meetLink);

            // Check that the meeting was created for the participants
            const participantMeetings = await calender.getMeetingsByAddress(addr1.address);
            expect(participantMeetings.length).to.equal(1);
            expect(participantMeetings[0].agenda).to.equal(agenda);

            const participantMeetings2 = await calender.getMeetingsByAddress(addr2.address);
            expect(participantMeetings2.length).to.equal(1);
            expect(participantMeetings2[0].agenda).to.equal(agenda);
        });

        it("Should fail if startTime is greater than or equal to endTime", async function () {
            const participants = [addr1.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 7200; // 2 AM
            const endTime = 3600; // 1 AM (invalid time)
        
            await expect(
                calender.createMeeting(participants, date, startTime, endTime, "Invalid Meeting", "https://example.com")
            ).to.be.revertedWith("Start time must be before end time.");
        });

        it("Should fail if participants list is empty", async function () {
            const participants = [];
            const date = 1693440000;
            const startTime = 3600;
            const endTime = 7200;
            const agenda = "Invalid Meeting";
            const meetLink = "https://example.com";
        
            // Create meeting with no participants
            await expect(
                calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink)
            ).to.be.revertedWith("At least one participant is required.");
        });
      
        it("Should allow duplicate meetings for the same user", async function () {
            const participants = [addr1.address];
            const date = 1693440000;
            const startTime = 3600;
            const endTime = 7200;
            const agenda = "Unique Meeting";
            const meetLink = "https://example.com";
      
            await calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink);

            await expect(
                calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink)
            )
            .to.emit(calender, "MeetingCreated") // Expect the MeetingCreated event to be emitted
            .withArgs(2, owner.address); // Expect the meeting ID and organizer address
        });
      
        it("Should revert if the meeting creation fails due to invalid parameters", async function () {
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 3600; // Same time for start and end (invalid)
      
            // Expect it to revert with an error message
            await expect(
              calender.createMeeting(participants, date, startTime, endTime, "Invalid Meeting", "https://example.com")
            ).to.be.revertedWith("Start time must be before end time.");
        });

    });

    describe("Reschedule Meeting", function () {
        let meetingId;

        beforeEach(async function () {
            // Create a meeting before each reschedule test
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
            const agenda = "Team Sync";
            const meetLink = "https://example.com";

            const tx = await calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink);
            const receipt = await tx.wait();
            const event = receipt.events.find((e) => e.event === "MeetingCreated");
            meetingId = event.args.meetingId;
        });

        it("Should reschedule a meeting successfully", async function () {
            const newDate = 1693526400; // New UNIX timestamp
            const newStartTime = 5400; // 1:30 AM
            const newEndTime = 10800; // 3:00 AM

            await expect(calender.rescheduleMeeting(meetingId, newDate, newStartTime, newEndTime))
                .to.emit(calender, "MeetingRescheduled")
                .withArgs(meetingId, newDate, newStartTime, newEndTime);
            
            // Check that the meeting was rescheduled
            const participantMeetings2 = await calender.getMeetingsByAddress(addr2.address);
            expect(participantMeetings2.length).to.equal(1);
            expect(participantMeetings2[0].date).to.equal(newDate);
            expect(participantMeetings2[0].startTime).to.equal(newStartTime);
            expect(participantMeetings2[0].endTime).to.equal(newEndTime);

        });

        it("Should revert if called by non-organizer", async function () {
            const newDate = 1693526400;
            const newStartTime = 5400;
            const newEndTime = 10800;

            await expect(
                calender.connect(addr1).rescheduleMeeting(meetingId, newDate, newStartTime, newEndTime)
            ).to.be.revertedWith("Not the meeting organizer.");
        });

        it("Should revert if rescheduling a cancelled meeting", async function () {
            const newDate = 1693526400;
            const newStartTime = 5400;
            const newEndTime = 10800;

            await calender.cancelMeeting(meetingId);

            await expect(calender.rescheduleMeeting(meetingId, newDate, newStartTime, newEndTime))
                .to.be.revertedWith("Meeting is cancelled.");
        });

        it("Should revert if start time is after or equal to end time", async function () {
            const newDate = 1693526400;
            const invalidStartTime = 10800; // 3:00 AM
            const invalidEndTime = 5400; // 1:30 AM

            await expect(
                calender.rescheduleMeeting(meetingId, newDate, invalidStartTime, invalidEndTime)
            ).to.be.revertedWith("Start time must be before end time.");
        });

        it("Should maintain original details if reschedule fails", async function () {
            const invalidStartTime = 10800; // 3:00 AM
            const invalidEndTime = 5400; // 1:30 AM

            await expect(
                calender.rescheduleMeeting(meetingId, 1693526400, invalidStartTime, invalidEndTime)
            ).to.be.revertedWith("Start time must be before end time.");

            // Check that the meeting was rescheduled
            const participantMeetings2 = await calender.getMeetingsByAddress(addr2.address);
            expect(participantMeetings2.length).to.equal(1);
            expect(participantMeetings2[0].startTime).to.equal(3600);
            expect(participantMeetings2[0].endTime).to.equal(7200);
        });
    });

    describe("Add Participants", function () {
        let meetingId;
    
        beforeEach(async function () {
            // Create a meeting before each test
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
            const agenda = "Team Sync";
            const meetLink = "https://example.com";

            const tx = await calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink);
            const receipt = await tx.wait();
            const event = receipt.events.find((e) => e.event === "MeetingCreated");
            meetingId = event.args.meetingId;
        });
    
        it("Should add new participants successfully", async function () {
            const newParticipants = [addr3.address, addr4.address];
    
            await expect(calender.addParticipants(meetingId, newParticipants))
                .to.emit(calender, "ParticipantAdded")
                .withArgs(meetingId, addr3.address)
                .and.to.emit(calender, "ParticipantAdded")
                .withArgs(meetingId, addr4.address);
    
            const meetingsForAddr3 = await calender.getMeetingsByAddress(addr3.address);
            expect(meetingsForAddr3.length).to.equal(1);
            expect(meetingsForAddr3[0].agenda).to.equal("Team Sync");
        });
    
        it("Should not add duplicate participants", async function () {
            const newParticipants = [addr1.address, addr3.address]; // addr1 already exists
    
            await expect(calender.addParticipants(meetingId, newParticipants))
                .to.emit(calender, "ParticipantAdded")
                .withArgs(meetingId, addr3.address);

            await expect(calender.addParticipants(meetingId, [addr1.address])).to.not.emit(calender, "ParticipantAdded");
        });

        it("Should fail if empty participant list is passed", async function () {
            await expect(calender.addParticipants(meetingId, [])).to.be.revertedWith("At least one participant is required.");
        });
    
        it("Should revert if a non-organizer tries to add participants", async function () {
            const newParticipants = [addr3.address];
    
            await expect(calender.connect(addr1).addParticipants(meetingId, newParticipants)).to.be.revertedWith(
                "Not the meeting organizer."
            );
        });
    
        it("Should revert if trying to add participants to a cancelled meeting", async function () {
            await calender.cancelMeeting(meetingId);
    
            const newParticipants = [addr3.address];
    
            await expect(calender.addParticipants(meetingId, newParticipants)).to.be.revertedWith("Meeting is cancelled.");
        });
    
        it("Should revert when adding participants to a non-existent meeting", async function () {
            const newParticipants = [addr3.address];
    
            await expect(calender.addParticipants(999, newParticipants)).to.be.reverted; // Invalid meeting ID
        });
    
        it("Should preserve meeting properties after adding participants", async function () {
            const newParticipants = [addr3.address];
    
            await calender.addParticipants(meetingId, newParticipants);
    
            const meeting = await calender.getMeetingsByAddress(owner.address);
            const updatedMeeting = meeting[0];
    
            expect(updatedMeeting.agenda).to.equal("Team Sync");
            expect(updatedMeeting.meetLink).to.equal("https://example.com");
            expect(updatedMeeting.date).to.equal(1693440000);
            expect(updatedMeeting.startTime).to.equal(3600);
            expect(updatedMeeting.endTime).to.equal(7200);
            expect(updatedMeeting.isCancelled).to.be.false;
        });
    });

    describe("Cancel Meeting", function () {
        let meetingId;
    
        beforeEach(async function () {
            // Create a meeting before each test
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
            const agenda = "Team Sync";
            const meetLink = "https://example.com";
    
            const tx = await calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink);
            const receipt = await tx.wait();
            const event = receipt.events.find((e) => e.event === "MeetingCreated");
            meetingId = event.args.meetingId;
        });
    
        it("Should cancel a meeting successfully", async function () {
            await expect(calender.cancelMeeting(meetingId))
                .to.emit(calender, "MeetingCancelled")
                .withArgs(meetingId);
    
            // Fetch the meeting details and verify cancellation
            const meetingsForOrganizer = await calender.getMeetingsByAddress(owner.address);
            expect(meetingsForOrganizer[0].isCancelled).to.be.true;
        });
    
        it("Should revert if a non-organizer tries to cancel the meeting", async function () {
            await expect(calender.connect(addr1).cancelMeeting(meetingId)).to.be.revertedWith("Not the meeting organizer.");
    
            // Verify the meeting is still active
            const meetingsForOrganizer = await calender.getMeetingsByAddress(owner.address);
            expect(meetingsForOrganizer[0].isCancelled).to.be.false;
        });
    
        it("Should revert if the meeting is already cancelled", async function () {
            await calender.cancelMeeting(meetingId);
    
            await expect(calender.cancelMeeting(meetingId)).to.be.revertedWith("Meeting is already cancelled.");
    
            // Verify the meeting remains cancelled
            const meetingsForOrganizer = await calender.getMeetingsByAddress(owner.address);
            expect(meetingsForOrganizer[0].isCancelled).to.be.true;
        });
    
        it("Should revert if trying to cancel a non-existent meeting", async function () {
            await expect(calender.cancelMeeting(999)).to.be.reverted; // Invalid meeting ID
        });
    
        it("Should preserve other meeting properties after cancellation", async function () {
            await calender.cancelMeeting(meetingId);
    
            const meetingsForOrganizer = await calender.getMeetingsByAddress(owner.address);
            const cancelledMeeting = meetingsForOrganizer[0];
    
            expect(cancelledMeeting.isCancelled).to.be.true;
            expect(cancelledMeeting.agenda).to.equal("Team Sync");
            expect(cancelledMeeting.meetLink).to.equal("https://example.com");
            expect(cancelledMeeting.date).to.equal(1693440000);
            expect(cancelledMeeting.startTime).to.equal(3600);
            expect(cancelledMeeting.endTime).to.equal(7200);
        });
    });

    describe("Get Meetings by Address", function () {
        let meetingId1, meetingId2;
    
        beforeEach(async function () {
    
            // Create the first meeting
            const participants1 = [addr1.address, addr2.address];
            const date1 = 1693440000; // Example UNIX timestamp
            const startTime1 = 3600; // 1 AM
            const endTime1 = 7200; // 2 AM
            const agenda1 = "Team Sync";
            const meetLink1 = "https://example.com";
    
            const tx1 = await calender.createMeeting(participants1, date1, startTime1, endTime1, agenda1, meetLink1);
            const receipt1 = await tx1.wait();
            const event1 = receipt1.events.find((e) => e.event === "MeetingCreated");
            meetingId1 = event1.args.meetingId;
    
            // Create the second meeting
            const participants2 = [addr2.address];
            const date2 = 1693526400; // Another UNIX timestamp
            const startTime2 = 5400; // 1:30 AM
            const endTime2 = 10800; // 3 AM
            const agenda2 = "Project Discussion";
            const meetLink2 = "https://example2.com";
    
            const tx2 = await calender.createMeeting(participants2, date2, startTime2, endTime2, agenda2, meetLink2);
            const receipt2 = await tx2.wait();
            const event2 = receipt2.events.find((e) => e.event === "MeetingCreated");
            meetingId2 = event2.args.meetingId;
        });
    
        it("Should return all meetings for a given address", async function () {
            // Get meetings for addr1
            const addr1Meetings = await calender.getMeetingsByAddress(addr1.address);
    
            expect(addr1Meetings.length).to.equal(1); // addr1 is in one meeting
            expect(addr1Meetings[0].agenda).to.equal("Team Sync");
            expect(addr1Meetings[0].meetLink).to.equal("https://example.com");
    
            // Get meetings for addr2
            const addr2Meetings = await calender.getMeetingsByAddress(addr2.address);
    
            expect(addr2Meetings.length).to.equal(2); // addr2 is in two meetings
            expect(addr2Meetings[0].agenda).to.equal("Team Sync");
            expect(addr2Meetings[1].agenda).to.equal("Project Discussion");
        });
    
        it("Should return an empty array if the address has no meetings", async function () {
            const addr3 = ethers.Wallet.createRandom(); // Random address with no meetings
            const addr3Meetings = await calender.getMeetingsByAddress(addr3.address);
    
            expect(addr3Meetings.length).to.equal(0);
        });
    
        it("Should correctly handle cancelled meetings", async function () {
            // Cancel one of addr2's meetings
            await calender.cancelMeeting(meetingId1);
    
            const addr2Meetings = await calender.getMeetingsByAddress(addr2.address);
    
            expect(addr2Meetings.length).to.equal(2); // Cancelled meetings are still part of the list
            expect(addr2Meetings[0].isCancelled).to.be.true; // Check the cancelled status
            expect(addr2Meetings[1].isCancelled).to.be.false;
        });
    
        it("Should preserve meeting order as created", async function () {
            const addr2Meetings = await calender.getMeetingsByAddress(addr2.address);
    
            expect(addr2Meetings[0].agenda).to.equal("Team Sync"); // First meeting
            expect(addr2Meetings[1].agenda).to.equal("Project Discussion"); // Second meeting
        });
    
        it("Should include meetings created by the user", async function () {
            const ownerMeetings = await calender.getMeetingsByAddress(owner.address);
    
            expect(ownerMeetings.length).to.equal(2); // Owner created two meetings
            expect(ownerMeetings[0].agenda).to.equal("Team Sync");
            expect(ownerMeetings[1].agenda).to.equal("Project Discussion");
        });
    });

    describe("Check Availability", function () {
        let meetingId1;
    
        beforeEach(async function () {
            // Create a meeting for addr1 and addr2
            const participants = [addr1.address, addr2.address];
            const date = 1693440000; // Example UNIX timestamp
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
            const agenda = "Team Sync";
            const meetLink = "https://example.com";
    
            const tx = await calender.createMeeting(participants, date, startTime, endTime, agenda, meetLink);
            const receipt = await tx.wait();
            const event = receipt.events.find((e) => e.event === "MeetingCreated");
            meetingId1 = event.args.meetingId;
        });
    
        it("Should return false if there is a time conflict with an existing meeting", async function () {
            const date = 1693440000; // Same date as the meeting
            const overlappingStartTime = 3500; // Overlaps with the existing meeting
            const overlappingEndTime = 3700; // Overlaps with the existing meeting
    
            const isAvailable = await calender.checkAvailability(
                addr1.address,
                date,
                overlappingStartTime,
                overlappingEndTime
            );
    
            expect(isAvailable).to.equal(false);
        });
    
        it("Should return true if there is no time conflict with an existing meeting", async function () {
            const date = 1693440000; // Same date as the meeting
            const nonOverlappingStartTime = 7201; // After the existing meeting ends
            const nonOverlappingEndTime = 9000; // 2:30 AM
    
            const isAvailable = await calender.checkAvailability(
                addr1.address,
                date,
                nonOverlappingStartTime,
                nonOverlappingEndTime
            );
    
            expect(isAvailable).to.equal(true);
        });
    
        it("Should return true if the user has no meetings on the given date", async function () {
            const date = 1693526400; // Different date
            const startTime = 3600; // 1 AM
            const endTime = 7200; // 2 AM
    
            const isAvailable = await calender.checkAvailability(
                addr3.address, // Address not involved in any meetings
                date,
                startTime,
                endTime
            );
    
            expect(isAvailable).to.equal(true);
        });
    
        it("Should return true if the meeting is cancelled", async function () {
            await calender.cancelMeeting(meetingId1);
    
            const date = 1693440000; // Same date as the cancelled meeting
            const startTime = 3600; // Same time as the cancelled meeting
            const endTime = 7200;
    
            const isAvailable = await calender.checkAvailability(
                addr1.address,
                date,
                startTime,
                endTime
            );
    
            expect(isAvailable).to.equal(true);
        });
    
        it("Should return false if the new meeting fully overlaps an existing meeting", async function () {
            const date = 1693440000; // Same date as the meeting
            const fullyOverlappingStartTime = 3600; // Exact match with start time
            const fullyOverlappingEndTime = 7200; // Exact match with end time
    
            const isAvailable = await calender.checkAvailability(
                addr2.address,
                date,
                fullyOverlappingStartTime,
                fullyOverlappingEndTime
            );
    
            expect(isAvailable).to.equal(false);
        });
    
        it("Should return false if the new meeting starts within an existing meeting", async function () {
            const date = 1693440000; // Same date as the meeting
            const overlappingStartTime = 3650; // Starts within the meeting
            const nonOverlappingEndTime = 7300; // Ends after the meeting
    
            const isAvailable = await calender.checkAvailability(
                addr1.address,
                date,
                overlappingStartTime,
                nonOverlappingEndTime
            );
    
            expect(isAvailable).to.equal(false);
        });

        it("Should return error if startTime is greater than endTime", async function () {
            const date = 1693440000;
            const overlappingStartTime = 7400; // Greater than endTime
            const nonOverlappingEndTime = 7300;
    
            await expect(calender.checkAvailability(
                addr1.address,
                date,
                overlappingStartTime,
                nonOverlappingEndTime
            )).to.be.revertedWith("Start time must be before end time.");
        });
    });
    
});