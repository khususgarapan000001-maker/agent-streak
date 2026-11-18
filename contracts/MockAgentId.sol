// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice TEST-ONLY mock of the SPACE ID Agent ID contract.
///         Mirrors the one function AgentStreak relies on: balanceOf(address).
///         Tests deploy this mock and pass its address to AgentStreak's
///         constructor. NEVER deployed to mainnet.
contract MockAgentId {
    mapping(address => uint256) public balanceOf;

    /// @notice Test helper: grant/revoke an Agent ID for `user`.
    function setBalance(address user, uint256 amount) external {
        balanceOf[user] = amount;
    }
}
