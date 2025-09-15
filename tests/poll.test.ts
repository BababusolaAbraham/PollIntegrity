import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_OPTIONS = 101;
const ERR_INVALID_DURATION = 102;
const ERR_INVALID_QUORUM = 103;
const ERR_INVALID_VOTING_TYPE = 104;
const ERR_INVALID_ANONYMITY = 105;
const ERR_POLL_ALREADY_EXISTS = 106;
const ERR_POLL_NOT_FOUND = 107;
const ERR_INVALID_TIMESTAMP = 108;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
const ERR_INVALID_MIN_STAKE = 110;
const ERR_INVALID_MAX_VOTES = 111;
const ERR_POLL_UPDATE_NOT_ALLOWED = 112;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_POLLS_EXCEEDED = 114;
const ERR_INVALID_POLL_TYPE = 115;
const ERR_INVALID_REWARD_RATE = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CATEGORY = 119;
const ERR_INVALID_STATUS = 120;
const ERR_POLL_ENDED = 121;
const ERR_POLL_NOT_STARTED = 122;
const ERR_ALREADY_VOTED = 123;
const ERR_INVALID_COMMITMENT = 124;
const ERR_INVALID_REVEAL = 125;
const ERR_INVALID_OPTION = 126;
const ERR_ANOMALY_DETECTED = 127;
const ERR_INVALID_VOTER = 128;
const ERR_QUORUM_NOT_MET = 129;
const ERR_INVALID_REWARD = 130;

interface Poll {
  title: string;
  options: string[];
  duration: number;
  quorum: number;
  votingType: string;
  anonymity: boolean;
  timestamp: number;
  creator: string;
  pollType: string;
  rewardRate: number;
  gracePeriod: number;
  location: string;
  category: string;
  status: boolean;
  minStake: number;
  maxVotes: number;
  startBlock: number;
  endBlock: number;
}

interface PollUpdate {
  updateTitle: string;
  updateDuration: number;
  updateQuorum: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PollManagerMock {
  state: {
    nextPollId: number;
    maxPolls: number;
    creationFee: number;
    authorityContract: string | null;
    polls: Map<number, Poll>;
    pollUpdates: Map<number, PollUpdate>;
    pollsByTitle: Map<string, number>;
    commitments: Map<string, Buffer>;
    votes: Map<string, number>;
    voteCounts: Map<string, number>;
    anomalyFlags: Map<number, boolean>;
  } = {
    nextPollId: 0,
    maxPolls: 1000,
    creationFee: 1000,
    authorityContract: null,
    polls: new Map(),
    pollUpdates: new Map(),
    pollsByTitle: new Map(),
    commitments: new Map(),
    votes: new Map(),
    voteCounts: new Map(),
    anomalyFlags: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPollId: 0,
      maxPolls: 1000,
      creationFee: 1000,
      authorityContract: null,
      polls: new Map(),
      pollUpdates: new Map(),
      pollsByTitle: new Map(),
      commitments: new Map(),
      votes: new Map(),
      voteCounts: new Map(),
      anomalyFlags: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createPoll(
    title: string,
    options: string[],
    duration: number,
    quorum: number,
    votingType: string,
    anonymity: boolean,
    pollType: string,
    rewardRate: number,
    gracePeriod: number,
    location: string,
    category: string,
    minStake: number,
    maxVotes: number
  ): Result<number> {
    if (this.state.nextPollId >= this.state.maxPolls) return { ok: false, value: ERR_MAX_POLLS_EXCEEDED };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (options.length <= 1 || options.length > 10) return { ok: false, value: ERR_INVALID_OPTIONS };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (quorum <= 0 || quorum > 100) return { ok: false, value: ERR_INVALID_QUORUM };
    if (!["single", "multiple"].includes(votingType)) return { ok: false, value: ERR_INVALID_VOTING_TYPE };
    if (!["governance", "survey", "election"].includes(pollType)) return { ok: false, value: ERR_INVALID_POLL_TYPE };
    if (rewardRate > 20) return { ok: false, value: ERR_INVALID_REWARD_RATE };
    if (gracePeriod > 30) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["dao", "community", "corporate"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (minStake < 0) return { ok: false, value: ERR_INVALID_MIN_STAKE };
    if (maxVotes <= 0) return { ok: false, value: ERR_INVALID_MAX_VOTES };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.pollsByTitle.has(title)) return { ok: false, value: ERR_POLL_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextPollId;
    const poll: Poll = {
      title,
      options,
      duration,
      quorum,
      votingType,
      anonymity,
      timestamp: this.blockHeight,
      creator: this.caller,
      pollType,
      rewardRate,
      gracePeriod,
      location,
      category,
      status: true,
      minStake,
      maxVotes,
      startBlock: this.blockHeight,
      endBlock: this.blockHeight + duration,
    };
    this.state.polls.set(id, poll);
    this.state.pollsByTitle.set(title, id);
    this.state.nextPollId++;
    return { ok: true, value: id };
  }

  getPoll(id: number): Poll | null {
    return this.state.polls.get(id) || null;
  }

  updatePoll(id: number, updateTitle: string, updateDuration: number, updateQuorum: number): Result<boolean> {
    const poll = this.state.polls.get(id);
    if (!poll) return { ok: false, value: false };
    if (poll.creator !== this.caller) return { ok: false, value: false };
    if (!updateTitle || updateTitle.length > 100) return { ok: false, value: false };
    if (updateDuration <= 0) return { ok: false, value: false };
    if (updateQuorum <= 0 || updateQuorum > 100) return { ok: false, value: false };
    if (this.state.pollsByTitle.has(updateTitle) && this.state.pollsByTitle.get(updateTitle) !== id) {
      return { ok: false, value: false };
    }

    const updated: Poll = {
      ...poll,
      title: updateTitle,
      duration: updateDuration,
      quorum: updateQuorum,
      timestamp: this.blockHeight,
      endBlock: poll.startBlock + updateDuration,
    };
    this.state.polls.set(id, updated);
    this.state.pollsByTitle.delete(poll.title);
    this.state.pollsByTitle.set(updateTitle, id);
    this.state.pollUpdates.set(id, {
      updateTitle,
      updateDuration,
      updateQuorum,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  castVote(pollId: number, commitment: Buffer): Result<boolean> {
    const poll = this.state.polls.get(pollId);
    if (!poll) return { ok: false, value: false };
    if (this.blockHeight < poll.startBlock) return { ok: false, value: false };
    if (this.blockHeight >= poll.endBlock) return { ok: false, value: false };
    const key = `${pollId}-${this.caller}`;
    if (this.state.commitments.has(key) || this.state.votes.has(key)) return { ok: false, value: false };

    this.stxTransfers.push({ amount: poll.minStake, from: this.caller, to: this.state.authorityContract });
    this.state.commitments.set(key, commitment);

    let totalVotes = 0;
    for (let i = 0; i < poll.options.length; i++) {
      totalVotes += this.state.voteCounts.get(`${pollId}-${i}`) || 0;
    }
    if (totalVotes > poll.maxVotes) {
      this.state.anomalyFlags.set(pollId, true);
      return { ok: false, value: false };
    }

    return { ok: true, value: true };
  }

  revealVote(pollId: number, option: number, salt: Buffer): Result<boolean> {
    const poll = this.state.polls.get(pollId);
    if (!poll) return { ok: false, value: false };
    if (this.blockHeight <= poll.endBlock) return { ok: false, value: false };
    const key = `${pollId}-${this.caller}`;
    const commitment = this.state.commitments.get(key);
    if (!commitment) return { ok: false, value: false };
    const expected = Buffer.from(require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from(option.toString()), salt])).digest('hex'), 'hex');
    if (!commitment.equals(expected)) return { ok: false, value: false };
    if (option >= poll.options.length) return { ok: false, value: false };

    this.state.votes.set(key, option);
    this.state.commitments.delete(key);
    const countKey = `${pollId}-${option}`;
    this.state.voteCounts.set(countKey, (this.state.voteCounts.get(countKey) || 0) + 1);
    return { ok: true, value: true };
  }

  finalizePoll(pollId: number): Result<boolean> {
    const poll = this.state.polls.get(pollId);
    if (!poll) return { ok: false, value: false };
    if (this.blockHeight < poll.endBlock + poll.gracePeriod) return { ok: false, value: false };
    let totalVotes = 0;
    for (let i = 0; i < poll.options.length; i++) {
      totalVotes += this.state.voteCounts.get(`${pollId}-${i}`) || 0;
    }
    if (totalVotes < poll.quorum) return { ok: false, value: false };
    const updated = { ...poll, status: false };
    this.state.polls.set(pollId, updated);
    return { ok: true, value: true };
  }

  getPollCount(): Result<number> {
    return { ok: true, value: this.state.nextPollId };
  }

  checkPollExistence(title: string): Result<boolean> {
    return { ok: true, value: this.state.pollsByTitle.has(title) };
  }
}

describe("PollManager", () => {
  let contract: PollManagerMock;

  beforeEach(() => {
    contract = new PollManagerMock();
    contract.reset();
  });

  it("creates a poll successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPoll(
      "Poll1",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const poll = contract.getPoll(0);
    expect(poll?.title).toBe("Poll1");
    expect(poll?.options).toEqual(["Opt1", "Opt2"]);
    expect(poll?.duration).toBe(100);
    expect(poll?.quorum).toBe(50);
    expect(poll?.votingType).toBe("single");
    expect(poll?.anonymity).toBe(true);
    expect(poll?.pollType).toBe("governance");
    expect(poll?.rewardRate).toBe(10);
    expect(poll?.gracePeriod).toBe(7);
    expect(poll?.location).toBe("LocationX");
    expect(poll?.category).toBe("dao");
    expect(poll?.minStake).toBe(50);
    expect(poll?.maxVotes).toBe(1000);
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate poll titles", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "Poll1",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    const result = contract.createPoll(
      "Poll1",
      ["Opt3", "Opt4"],
      200,
      60,
      "multiple",
      false,
      "survey",
      15,
      14,
      "LocationY",
      "community",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POLL_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.createPoll(
      "Poll2",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("parses poll title with Clarity", () => {
    const cv = stringUtf8CV("Poll3");
    expect(cv.value).toBe("Poll3");
  });

  it("rejects poll creation without authority contract", () => {
    const result = contract.createPoll(
      "NoAuth",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid options", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPoll(
      "InvalidOptions",
      ["Opt1"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_OPTIONS);
  });

  it("rejects invalid duration", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPoll(
      "InvalidDuration",
      ["Opt1", "Opt2"],
      0,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DURATION);
  });

  it("rejects invalid poll type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPoll(
      "InvalidType",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "invalid",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_POLL_TYPE);
  });

  it("updates a poll successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "OldPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    const result = contract.updatePoll(0, "NewPoll", 150, 60);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const poll = contract.getPoll(0);
    expect(poll?.title).toBe("NewPoll");
    expect(poll?.duration).toBe(150);
    expect(poll?.quorum).toBe(60);
    const update = contract.state.pollUpdates.get(0);
    expect(update?.updateTitle).toBe("NewPoll");
    expect(update?.updateDuration).toBe(150);
    expect(update?.updateQuorum).toBe(60);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent poll", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updatePoll(99, "NewPoll", 150, 60);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.caller = "ST3FAKE";
    const result = contract.updatePoll(0, "NewPoll", 150, 60);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without authority contract", () => {
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct poll count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "Poll1",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.createPoll(
      "Poll2",
      ["Opt3", "Opt4"],
      200,
      60,
      "multiple",
      false,
      "survey",
      15,
      14,
      "LocationY",
      "community",
      100,
      2000
    );
    const result = contract.getPollCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks poll existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    const result = contract.checkPollExistence("TestPoll");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPollExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses poll parameters with Clarity types", () => {
    const title = stringUtf8CV("TestPoll");
    const duration = uintCV(100);
    const quorum = uintCV(50);
    expect(title.value).toBe("TestPoll");
    expect(duration.value).toEqual(BigInt(100));
    expect(quorum.value).toEqual(BigInt(50));
  });

  it("rejects poll creation with empty title", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPoll(
      "",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects poll creation with max polls exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxPolls = 1;
    contract.createPoll(
      "Poll1",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    const result = contract.createPoll(
      "Poll2",
      ["Opt3", "Opt4"],
      200,
      60,
      "multiple",
      false,
      "survey",
      15,
      14,
      "LocationY",
      "community",
      100,
      2000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_POLLS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("casts vote successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    const commitment = Buffer.from("commitment");
    const result = contract.castVote(0, commitment);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.stxTransfers.length).toBe(2);
    expect(contract.stxTransfers[1]).toEqual({ amount: 50, from: "ST1TEST", to: "ST2TEST" });
  });

  it("rejects vote before poll start", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = -1;
    const result = contract.castVote(0, Buffer.from("commitment"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects vote after poll end", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 101;
    const result = contract.castVote(0, Buffer.from("commitment"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects double vote", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    contract.castVote(0, Buffer.from("commitment"));
    const result = contract.castVote(0, Buffer.from("newcommitment"));
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("reveals vote successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    const salt = Buffer.from("salt");
    const expected = require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from("0"), salt])).digest();
    contract.castVote(0, expected);
    contract.blockHeight = 101;
    const result = contract.revealVote(0, 0, salt);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.votes.get("0-ST1TEST")).toBe(0);
    expect(contract.state.voteCounts.get("0-0")).toBe(1);
  });

  it("rejects reveal before poll end", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    const salt = Buffer.from("salt");
    const expected = require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from("0"), salt])).digest();
    contract.castVote(0, expected);
    const result = contract.revealVote(0, 0, salt);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects invalid reveal", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    const salt = Buffer.from("salt");
    const expected = require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from("0"), salt])).digest();
    contract.castVote(0, expected);
    contract.blockHeight = 101;
    const wrongSalt = Buffer.from("wrongsalt");
    const result = contract.revealVote(0, 0, wrongSalt);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("finalizes poll successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      2,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 10;
    const salt1 = Buffer.from("salt1");
    const expected1 = require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from("0"), salt1])).digest();
    contract.castVote(0, expected1);
    const salt2 = Buffer.from("salt2");
    const expected2 = require('crypto').createHash('sha256').update(Buffer.concat([Buffer.from("1"), salt2])).digest();
    contract.caller = "ST2TEST";
    contract.castVote(0, expected2);
    contract.blockHeight = 101;
    contract.caller = "ST1TEST";
    contract.revealVote(0, 0, salt1);
    contract.caller = "ST2TEST";
    contract.revealVote(0, 1, salt2);
    contract.blockHeight = 108;
    const result = contract.finalizePoll(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const poll = contract.getPoll(0);
    expect(poll?.status).toBe(false);
  });

  it("rejects finalize before grace period", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 106;
    const result = contract.finalizePoll(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects finalize if quorum not met", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPoll(
      "TestPoll",
      ["Opt1", "Opt2"],
      100,
      50,
      "single",
      true,
      "governance",
      10,
      7,
      "LocationX",
      "dao",
      50,
      1000
    );
    contract.blockHeight = 108;
    const result = contract.finalizePoll(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});