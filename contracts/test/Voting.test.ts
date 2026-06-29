import { expect } from "chai";
import { ethers } from "hardhat";

describe("Voting", function () {
  it("deploys, creates election, votes once, and prevents double voting", async function () {
    const [owner, voter] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(owner.address);
    await voting.waitForDeployment();

    const electionName = "Test Election";
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - 60;
    const endTime = now + 3600;
    const candidateIds = [1, 2];

    const txCreate = await voting
      .connect(owner)
      .createElection(electionName, startTime, endTime, candidateIds, false, 0);
    await txCreate.wait();

    const electionId = 1;

    const txStart = await voting.connect(owner).startElection(electionId);
    await txStart.wait();

    const txRegister = await voting.connect(owner).registerVoter(voter.address);
    await txRegister.wait();

    const txVote1 = await voting.connect(voter).vote(electionId, 1);
    await txVote1.wait();

    const votesCandidate1 = await voting.getCandidateVoteCount(
      electionId,
      1
    );
    expect(votesCandidate1).to.equal(1n);

    const hasVoted = await voting.hasVoted(electionId, voter.address);
    expect(hasVoted).to.equal(true);

    await expect(
      voting.connect(voter).vote(electionId, 1)
    ).to.be.revertedWith("Already voted");
  });
});

