// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentStreak
/// @notice Free daily check-in for Binance Agent ID holders on BNB Chain.
///         A holder checks in once per UTC day; the contract tracks their
///         current streak, longest streak, and total check-ins. There is no
///         owner, no admin function, no fee, no token, and no pausing — the
///         contract is fully permissionless and minimal.
///
/// @dev Agent ID gating: an address holds an Agent ID iff balanceOf(address)
///      on the SPACE ID Agent ID contract (ERC-721, non-transferable) is > 0.
///      The Agent ID contract address is supplied once at deployment and is
///      immutable afterwards. Agent ID contract (BNB Chain):
///      0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
contract AgentStreak {
    /// @notice SPACE ID Agent ID contract (ERC-721, non-transferable), set at
    ///         deployment. On BNB Chain mainnet this is
    ///         0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F.
    address public immutable AGENT_ID;

    /// @notice Emitted on every successful check-in.
    event CheckIn(address indexed user, uint256 indexed day, uint256 streak);

    /// @param agentId The Agent ID ERC-721 contract to gate check-ins on.
    constructor(address agentId) {
        AGENT_ID = agentId;
    }

    /// @notice Last UTC day (block.timestamp / 86400) the user checked in.
    mapping(address => uint256) public lastCheckInDay;

    /// @notice Current consecutive-day streak per user.
    mapping(address => uint256) public currentStreak;

    /// @notice Longest streak ever achieved per user.
    mapping(address => uint256) public longestStreak;

    /// @notice Total check-ins per user.
    mapping(address => uint256) public totalCheckIns;

    /// @notice Whether an address has ever checked in (used for the unique counter).
    mapping(address => bool) public hasCheckedIn;

    /// @notice Total check-ins across all users.
    uint256 public totalCheckInsGlobal;

    /// @notice Number of distinct addresses that have checked in at least once.
    uint256 public uniqueCheckInners;

    /// @notice Revert reason: caller does not hold an Agent ID.
    error NoAgentId();

    /// @notice Revert reason: caller already checked in today (UTC).
    error AlreadyCheckedInToday();

    /// @notice Check in for the current UTC day.
    /// @dev Reverts if the caller holds no Agent ID or already checked in today.
    ///      Streak increments when the last check-in was yesterday (UTC);
    ///      otherwise the streak resets to 1 (a missed day breaks it).
    function checkIn() external {
        if (!_holdsAgentId(msg.sender)) revert NoAgentId();

        uint256 today = block.timestamp / 86400;
        uint256 lastDay = lastCheckInDay[msg.sender];
        if (lastDay == today) revert AlreadyCheckedInToday();

        uint256 streak = (lastDay + 1 == today) ? currentStreak[msg.sender] + 1 : 1;

        lastCheckInDay[msg.sender] = today;
        currentStreak[msg.sender] = streak;
        if (streak > longestStreak[msg.sender]) {
            longestStreak[msg.sender] = streak;
        }
        totalCheckIns[msg.sender] += 1;

        if (!hasCheckedIn[msg.sender]) {
            hasCheckedIn[msg.sender] = true;
            uniqueCheckInners += 1;
        }
        totalCheckInsGlobal += 1;

        emit CheckIn(msg.sender, today, streak);
    }

    /// @notice Returns true if `user` currently holds an Agent ID.
    function holdsAgentId(address user) public view returns (bool) {
        return _holdsAgentId(user);
    }

    /// @notice Returns true if `user` can check in right now (holds an Agent
    ///         ID and has not checked in yet today, UTC).
    function canCheckIn(address user) external view returns (bool) {
        return _holdsAgentId(user) && lastCheckInDay[user] != block.timestamp / 86400;
    }

    /// @notice Full per-user stats: (lastCheckInDay, currentStreak,
    ///         longestStreak, totalCheckIns, hasCheckedIn).
    function getUserStats(address user)
        external
        view
        returns (
            uint256 _lastCheckInDay,
            uint256 _currentStreak,
            uint256 _longestStreak,
            uint256 _totalCheckIns,
            bool _hasCheckedIn
        )
    {
        return (
            lastCheckInDay[user],
            currentStreak[user],
            longestStreak[user],
            totalCheckIns[user],
            hasCheckedIn[user]
        );
    }

    /// @notice Global stats: (totalCheckInsGlobal, uniqueCheckInners).
    function getGlobalStats() external view returns (uint256, uint256) {
        return (totalCheckInsGlobal, uniqueCheckInners);
    }

    /// @notice Current UTC day number (block.timestamp / 86400).
    function currentDay() external view returns (uint256) {
        return block.timestamp / 86400;
    }

    /// @dev Reads balanceOf on the Agent ID ERC-721 contract. A return value
    ///      greater than 0 means the address holds an Agent ID.
    function _holdsAgentId(address user) internal view returns (bool) {
        (bool ok, bytes memory data) = AGENT_ID.staticcall(
            abi.encodeWithSignature("balanceOf(address)", user)
        );
        if (!ok || data.length < 32) return false;
        return abi.decode(data, (uint256)) > 0;
    }
}
