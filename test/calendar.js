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
            .withArgs(1, owner.address, date, startTime, endTime, agenda, meetLink); // Expect the meeting ID and organizer address

            // Check that the meeting was created for the organizer
            const meeting = await calender.getMeetingDetails(1);
            expect(meeting.organizer).to.equal(owner.address);
            expect(meeting.agenda).to.equal(agenda);
            expect(meeting.meetLink).to.equal(meetLink);

            // Check that the meeting was created for the participants
            expect(meeting.participants).to.include(addr1.address);
            expect(meeting.participants).to.include(addr2.address);
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
            .withArgs(2, owner.address, date, startTime, endTime, agenda, meetLink); // Expect the meeting ID and organizer address
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
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.date).to.equal(newDate);
            expect(meeting.startTime).to.equal(newStartTime);
            expect(meeting.endTime).to.equal(newEndTime);

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

            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.startTime).to.equal(3600);
            expect(meeting.endTime).to.equal(7200);
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
    
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.agenda).to.equal("Team Sync");
            expect(meeting.participants).to.include(addr3.address);
            expect(meeting.participants).to.include(addr4.address);
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
    
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.agenda).to.equal("Team Sync");
            expect(meeting.meetLink).to.equal("https://example.com");
            expect(meeting.date).to.equal(1693440000);
            expect(meeting.startTime).to.equal(3600);
            expect(meeting.endTime).to.equal(7200);
            expect(meeting.isCancelled).to.be.false;
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
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.isCancelled).to.be.true;
        });
    
        it("Should revert if a non-organizer tries to cancel the meeting", async function () {
            await expect(calender.connect(addr1).cancelMeeting(meetingId)).to.be.revertedWith("Not the meeting organizer.");
    
            // Verify the meeting is still active
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.isCancelled).to.be.false;
        });
    
        it("Should revert if the meeting is already cancelled", async function () {
            await calender.cancelMeeting(meetingId);
    
            await expect(calender.cancelMeeting(meetingId)).to.be.revertedWith("Meeting is already cancelled.");
    
            // Verify the meeting remains cancelled
            const meeting = await calender.getMeetingDetails(meetingId);
            expect(meeting.isCancelled).to.be.true;
        });
    
        it("Should revert if trying to cancel a non-existent meeting", async function () {
            await expect(calender.cancelMeeting(999)).to.be.reverted; // Invalid meeting ID
        });
    
        it("Should preserve other meeting properties after cancellation", async function () {
            await calender.cancelMeeting(meetingId);
            
            const meeting = await calender.getMeetingDetails(meetingId);
    
            expect(meeting.isCancelled).to.be.true;
            expect(meeting.agenda).to.equal("Team Sync");
            expect(meeting.meetLink).to.equal("https://example.com");
            expect(meeting.date).to.equal(1693440000);
            expect(meeting.startTime).to.equal(3600);
            expect(meeting.endTime).to.equal(7200);
        });
    });

});