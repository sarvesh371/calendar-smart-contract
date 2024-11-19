// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Calender {
    struct Meeting {
        address organizer;
        uint256 date; // UNIX timestamp for the meeting date
        uint256 startTime; // Meeting start time in seconds from midnight
        uint256 endTime;   // Meeting end time in seconds from midnight
        string agenda;
        string meetLink;
        bool isCancelled;
        mapping(address => bool) isParticipant;
    }

    struct MeetingView {
        address organizer;
        uint256 date;
        uint256 startTime;
        uint256 endTime;
        string agenda;
        string meetLink;
        bool isCancelled;
}

    uint256 public meetingIdCounter = 1; // Start the meeting counter from 1
    mapping(uint256 => Meeting) private meetings; // Tracks all meetings by ID
    mapping(address => uint256[]) private userMeetings; // Tracks meetings by address

    // Check if the caller is the organizer of the meeting
    modifier onlyOrganizer(uint256 meetingId) {
        require(msg.sender == meetings[meetingId].organizer, "Not the meeting organizer.");
        _;
    }

    // Check if the meeting time is valid
    modifier validTime(uint256 startTime, uint256 endTime) {
        require(startTime < endTime, "Start time must be before end time.");
        _;
    }

    // Events
    event MeetingCreated(uint256 meetingId, address indexed organizer);
    event MeetingRescheduled(uint256 meetingId, uint256 newDate, uint256 newStartTime, uint256 newEndTime);
    event MeetingCancelled(uint256 meetingId);
    event ParticipantAdded(uint256 meetingId, address participant);

    // Create a meeting
    function createMeeting(
        address[] calldata participants,
        uint256 date,
        uint256 startTime,
        uint256 endTime,
        string calldata agenda,
        string calldata meetLink
    ) external validTime(startTime, endTime) {
        require(participants.length > 0, "At least one participant is required.");

        uint256 meetingId = meetingIdCounter++;
        Meeting storage meeting = meetings[meetingId];
        meeting.organizer = msg.sender;
        meeting.date = date;
        meeting.startTime = startTime;
        meeting.endTime = endTime;
        meeting.agenda = agenda;
        meeting.meetLink = meetLink;
        meeting.isCancelled = false;

        // Track the organizer's meetings
        addMeetingToUser(msg.sender, meetingId);

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            if (!meeting.isParticipant[participant]) {
                meeting.isParticipant[participant] = true;
                addMeetingToUser(participant, meetingId);
            }
        }

        emit MeetingCreated(meetingId, msg.sender);
    }

    // Reschedule a meeting
    function rescheduleMeeting(
        uint256 meetingId,
        uint256 newDate,
        uint256 newStartTime,
        uint256 newEndTime
    ) external onlyOrganizer(meetingId) validTime(newStartTime, newEndTime) {
        Meeting storage meeting = meetings[meetingId];
        require(!meeting.isCancelled, "Meeting is cancelled.");

        meeting.date = newDate;
        meeting.startTime = newStartTime;
        meeting.endTime = newEndTime;

        emit MeetingRescheduled(meetingId, newDate, newStartTime, newEndTime);
    }

    // Add participants to a meeting
    function addParticipants(uint256 meetingId, address[] calldata newParticipants) external onlyOrganizer(meetingId) {
        require(newParticipants.length > 0, "At least one participant is required.");
        Meeting storage meeting = meetings[meetingId];
        require(!meeting.isCancelled, "Meeting is cancelled.");

        for (uint256 i = 0; i < newParticipants.length; i++) {
            address participant = newParticipants[i];

            if (!meeting.isParticipant[participant]) {
                meeting.isParticipant[participant] = true;
                addMeetingToUser(participant, meetingId);
                emit ParticipantAdded(meetingId, participant);
            }
        }
    }

    // Cancel a meeting
    function cancelMeeting(uint256 meetingId) external onlyOrganizer(meetingId) {
        Meeting storage meeting = meetings[meetingId];
        require(!meeting.isCancelled, "Meeting is already cancelled.");

        meeting.isCancelled = true;

        emit MeetingCancelled(meetingId);
    }

    // Check all meetings of an address
    function getMeetingsByAddress(address addr) external view returns (MeetingView[] memory) {
        uint256[] memory meetingIds = userMeetings[addr];
        MeetingView[] memory meetingDetails = new MeetingView[](meetingIds.length);

        for (uint256 i = 0; i < meetingIds.length; i++) {
            uint256 meetingId = meetingIds[i];
            Meeting storage meeting = meetings[meetingId];
            meetingDetails[i] = MeetingView({
                organizer: meeting.organizer,
                date: meeting.date,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                agenda: meeting.agenda,
                meetLink: meeting.meetLink,
                isCancelled: meeting.isCancelled
            });
        }

        return meetingDetails;
    }

    // Check availability of an address on a specific date and time
    function checkAvailability(
        address addr,
        uint256 date,
        uint256 startTime,
        uint256 endTime
    ) external view validTime(startTime, endTime) returns (bool) {
        uint256[] memory userMeetingIds = userMeetings[addr];

        for (uint256 i = 0; i < userMeetingIds.length; i++) {
            Meeting storage meeting = meetings[userMeetingIds[i]];

            if (meeting.date == date && !meeting.isCancelled) {
                if (
                    (startTime >= meeting.startTime && startTime < meeting.endTime) ||
                    (endTime > meeting.startTime && endTime <= meeting.endTime) ||
                    (startTime <= meeting.startTime && endTime >= meeting.endTime)
                ) {
                    return false; // Overlapping meeting found
                }
            }
        }

        return true; // No conflicts
    }

    function addMeetingToUser(address user, uint256 meetingId) internal {
        uint256[] storage userMeetingsList = userMeetings[user];
        for (uint256 i = 0; i < userMeetingsList.length; i++) {
            if (userMeetingsList[i] == meetingId) {
                return; // Meeting already added
            }
        }
        userMeetingsList.push(meetingId);
    }

    function isParticipant(uint256 meetingId, address participant) external view returns (bool) {
        Meeting storage meeting = meetings[meetingId];
        return meeting.isParticipant[participant];
    }
}
