// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Voting is Ownable {
    enum ElectionState {
        Created,
        Active,
        Ended
    }

    struct Election {
        string name;
        uint64 startTime;
        uint64 endTime;
        ElectionState state;
        bool exists;
        uint256 totalVotes;
        uint256[] candidateIds;
    }

    uint256 public nextElectionId;

    mapping(address => bool) public isEligibleVoter;
    mapping(uint256 => Election) private elections;
    mapping(uint256 => mapping(uint256 => uint256)) private candidateVotes;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    event VoterRegistered(address indexed voter);

    event ElectionCreated(
        uint256 indexed electionId,
        string name,
        uint64 startTime,
        uint64 endTime,
        uint256[] candidateIds
    );

    event ElectionStarted(uint256 indexed electionId);
    event ElectionEnded(uint256 indexed electionId);

    event VoteCast(
        uint256 indexed electionId,
        uint256 indexed candidateId
    );

    event VoterVoted(
        uint256 indexed electionId,
        address indexed voter
    );


    constructor(address initialOwner) Ownable(initialOwner) {
        nextElectionId = 1;
    }

    function createElection(
        string calldata name,
        uint64 startTime,
        uint64 endTime,
        uint256[] calldata candidateIds
    ) external onlyOwner returns (uint256 electionId) {
        require(bytes(name).length > 0, "Name required");
        require(candidateIds.length > 0, "At least one candidate");
        require(startTime < endTime, "Invalid time window");

        electionId = nextElectionId;
        nextElectionId++;

        Election storage e = elections[electionId];
        require(!e.exists, "Election already exists");

        e.name = name;
        e.startTime = startTime;
        e.endTime = endTime;
        e.state = ElectionState.Created;
        e.exists = true;
        e.totalVotes = 0;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            e.candidateIds.push(candidateIds[i]);
        }

        emit ElectionCreated(electionId, name, startTime, endTime, candidateIds);
    }

    function startElection(uint256 electionId) external onlyOwner {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");
        require(e.state == ElectionState.Created, "Invalid state");
        require(block.timestamp <= e.endTime, "End time passed");

        e.state = ElectionState.Active;
        emit ElectionStarted(electionId);
    }

    function endElection(uint256 electionId) external onlyOwner {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");
        require(e.state == ElectionState.Active, "Invalid state");

        e.state = ElectionState.Ended;
        emit ElectionEnded(electionId);
    }

    function registerVoter(address voter) external onlyOwner {
        require(voter != address(0), "Invalid address");
        require(!isEligibleVoter[voter], "Already registered");
        isEligibleVoter[voter] = true;
        emit VoterRegistered(voter);
    }

    function _vote(uint256 electionId, uint256 candidateId, address voter) internal {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");
        require(e.state == ElectionState.Active, "Election not active");
        require(
            block.timestamp >= e.startTime && block.timestamp <= e.endTime,
            "Not in voting window"
        );
        require(isEligibleVoter[voter], "Not an eligible voter");
        require(!_hasVoted[electionId][voter], "Already voted");
        require(_isValidCandidate(e, candidateId), "Invalid candidate");

        _hasVoted[electionId][voter] = true;
        candidateVotes[electionId][candidateId] += 1;
        e.totalVotes += 1;

        emit VoterVoted(electionId, voter);
        emit VoteCast(electionId, candidateId);
    }

    function vote(uint256 electionId, uint256 candidateId) external {
        _vote(electionId, candidateId, msg.sender);
    }

    /**
     * @notice Casts a vote using a cryptographic ECDSA signature from the voter.
     * Allows gasless voting, where the relayer pays the transaction fees.
     */
    function voteWithSignature(
        uint256 electionId,
        uint256 candidateId,
        bytes calldata signature
    ) external {
        // Construct the EIP-191 signed message hash (matching ethers.js signMessage)
        bytes32 messageHash = keccak256(
            abi.encodePacked(electionId, candidateId, address(this))
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Recover the voter's address from the signature
        address voter = ECDSA.recover(ethSignedMessageHash, signature);

        // Record the vote on-chain
        _vote(electionId, candidateId, voter);
    }

    function getElection(
        uint256 electionId
    )
        external
        view
        returns (
            string memory name,
            uint64 startTime,
            uint64 endTime,
            ElectionState state,
            uint256 totalVotes,
            uint256[] memory candidateIds
        )
    {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");

        return (
            e.name,
            e.startTime,
            e.endTime,
            e.state,
            e.totalVotes,
            e.candidateIds
        );
    }

    function getCandidateVoteCount(
        uint256 electionId,
        uint256 candidateId
    ) external view returns (uint256) {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");
        require(_isValidCandidate(e, candidateId), "Invalid candidate");
        return candidateVotes[electionId][candidateId];
    }

    function hasVoted(
        uint256 electionId,
        address voter
    ) external view returns (bool) {
        return _hasVoted[electionId][voter];
    }

    function getCandidateIds(
        uint256 electionId
    ) external view returns (uint256[] memory) {
        Election storage e = elections[electionId];
        require(e.exists, "Election not found");
        return e.candidateIds;
    }

    function _isValidCandidate(
        Election storage e,
        uint256 candidateId
    ) internal view returns (bool) {
        uint256 len = e.candidateIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (e.candidateIds[i] == candidateId) {
                return true;
            }
        }
        return false;
    }
}

