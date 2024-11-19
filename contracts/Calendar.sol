// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Calender {
    struct Meeting {
        address organizer;
        address[] participants;
        uint256 date; // UNIX timestamp for the meeting date
        uint256 startTime; // Meeting start time in seconds from midnight
        uint256 endTime;   // Meeting end time in seconds from midnight
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
        meetings[meetingId] = Meeting({
            organizer: msg.sender,
            participants: participants,
            date: date,
            startTime: startTime,
            endTime: endTime,
            agenda: agenda,
            meetLink: meetLink,
            isCancelled: false
        });

        // Track the organizer's meetings
        addMeetingToUser(msg.sender, meetingId);

        // Track participants' meetings
        for (uint256 i = 0; i < participants.length; i++) {
            addMeetingToUser(participants[i], meetingId);
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

            // Check if participant is already in the meeting
            bool alreadyAdded = false;
            for (uint256 j = 0; j < meeting.participants.length; j++) {
                if (meeting.participants[j] == participant) {
                    alreadyAdded = true;
                    break;
                }
            }

            if (!alreadyAdded) {
                meeting.participants.push(participant);
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
    function getMeetingsByAddress(address addr) external view returns (Meeting[] memory) {
        uint256[] memory meetingIds = userMeetings[addr];
        Meeting[] memory meetingDetails = new Meeting[](meetingIds.length);

        for (uint256 i = 0; i < meetingIds.length; i++) {
            uint256 meetingId = meetingIds[i];
            meetingDetails[i] = meetings[meetingId];
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
            Meeting memory meeting = meetings[userMeetingIds[i]];

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
}
