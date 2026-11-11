// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Jane's Closet — clay dress-up looks and the daily "Look of the Day" challenge.
/// @notice Looks are stored as a 32-byte outfit recipe; the browser rebuilds the picture from preset layers.
///         No tokens, no payments. A "day" is a UTC day: block.timestamp / 1 days.
contract JanesCloset {
    struct Look {
        address owner;
        bytes32 recipe;
        string name;
        uint64 at;
    }

    uint256 public constant THEME_COUNT = 30;
    uint256 public constant MAX_NAME_BYTES = 20;

    Look[] public looks;
    mapping(address => uint256[]) private _looksOf;
    mapping(address => uint256) public crowns;

    // day => entered look ids, in entry order
    mapping(uint32 => uint256[]) private _entries;
    // day => lookId => 1-based position in _entries (0 = not entered)
    mapping(uint32 => mapping(uint256 => uint256)) private _entryPos;
    // day => wallet => lookId + 1 (0 = not entered)
    mapping(uint32 => mapping(address => uint256)) private _enteredLook;
    // day => lookId => votes
    mapping(uint32 => mapping(uint256 => uint256)) private _votes;
    // day => voter => lookId + 1 (0 = not voted)
    mapping(uint32 => mapping(address => uint256)) private _votedFor;
    // day => current leader lookId + 1 (0 = no entries)
    mapping(uint32 => uint256) private _leader;
    mapping(uint32 => bool) public finalized;
    // day => winning lookId + 1 (0 = none)
    mapping(uint32 => uint256) private _winner;
    uint32[] private _crownedDays;

    uint256 public totalEntries;
    uint256 public totalVotes;

    event LookSaved(uint256 indexed id, address indexed owner);
    event Entered(uint32 indexed day, uint256 indexed lookId);
    event Voted(uint32 indexed day, uint256 indexed lookId, address indexed voter);
    event Crowned(uint32 indexed day, uint256 indexed lookId, address indexed owner);

    error EmptyRecipe();
    error NameTooLong();
    error NoSuchLook();
    error NotYourLook();
    error AlreadyEntered();
    error NotToday();
    error NotEntered();
    error OwnLook();
    error AlreadyVoted();
    error DayNotOver();
    error AlreadyFinalized();

    // ------------------------------------------------------------------ writes

    function saveLook(bytes32 recipe, string calldata name) external returns (uint256 id) {
        if (recipe == bytes32(0)) revert EmptyRecipe();
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();
        id = looks.length;
        looks.push(Look(msg.sender, recipe, name, uint64(block.timestamp)));
        _looksOf[msg.sender].push(id);
        emit LookSaved(id, msg.sender);
    }

    function enter(uint256 lookId) external {
        if (lookId >= looks.length) revert NoSuchLook();
        if (looks[lookId].owner != msg.sender) revert NotYourLook();
        uint32 day = today();
        if (_enteredLook[day][msg.sender] != 0) revert AlreadyEntered();
        _enteredLook[day][msg.sender] = lookId + 1;
        _entries[day].push(lookId);
        _entryPos[day][lookId] = _entries[day].length;
        if (_leader[day] == 0) _leader[day] = lookId + 1;
        totalEntries++;
        emit Entered(day, lookId);
    }

    /// @notice One vote per wallet per day, only for today's challenge, never for your own look.
    function vote(uint32 day, uint256 lookId) external {
        if (day != today()) revert NotToday();
        if (_entryPos[day][lookId] == 0) revert NotEntered();
        if (looks[lookId].owner == msg.sender) revert OwnLook();
        if (_votedFor[day][msg.sender] != 0) revert AlreadyVoted();
        _votedFor[day][msg.sender] = lookId + 1;
        uint256 v = ++_votes[day][lookId];
        totalVotes++;

        // Keep the leader up to date. Ties go to the earlier entry.
        uint256 leader = _leader[day] - 1;
        if (leader != lookId) {
            uint256 lv = _votes[day][leader];
            if (v > lv || (v == lv && _entryPos[day][lookId] < _entryPos[day][leader])) {
                _leader[day] = lookId + 1;
            }
        }
        emit Voted(day, lookId, msg.sender);
    }

    /// @notice Anyone can crown the winner once the day is over.
    function finalize(uint32 day) external {
        if (day >= today()) revert DayNotOver();
        if (finalized[day]) revert AlreadyFinalized();
        finalized[day] = true;
        uint256 leader = _leader[day];
        if (leader == 0) return; // nobody entered
        uint256 lookId = leader - 1;
        _winner[day] = leader;
        address owner = looks[lookId].owner;
        crowns[owner]++;
        _crownedDays.push(day);
        emit Crowned(day, lookId, owner);
    }

    // ------------------------------------------------------------------- views

    function today() public view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }

    function themeIndex(uint32 day) public pure returns (uint256) {
        return uint256(day) % THEME_COUNT;
    }

    function looksCount() external view returns (uint256) {
        return looks.length;
    }

    function getLook(uint256 id) external view returns (Look memory) {
        if (id >= looks.length) revert NoSuchLook();
        return looks[id];
    }

    function getLooks(uint256[] calldata ids) external view returns (Look[] memory out) {
        out = new Look[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            if (ids[i] >= looks.length) revert NoSuchLook();
            out[i] = looks[ids[i]];
        }
    }

    function looksOf(address who) external view returns (uint256[] memory) {
        return _looksOf[who];
    }

    function entries(uint32 day) external view returns (uint256[] memory) {
        return _entries[day];
    }

    function votesFor(uint32 day, uint256 lookId) external view returns (uint256) {
        return _votes[day][lookId];
    }

    /// @notice Everything the challenge page needs for one day in a single call.
    function dayInfo(uint32 day)
        external
        view
        returns (uint256[] memory ids, uint256[] memory votes, Look[] memory items, bool isFinal, uint256 leader)
    {
        ids = _entries[day];
        votes = new uint256[](ids.length);
        items = new Look[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            votes[i] = _votes[day][ids[i]];
            items[i] = looks[ids[i]];
        }
        isFinal = finalized[day];
        leader = _leader[day]; // lookId + 1, 0 = none
    }

    /// @return lookId + 1 that won the day (0 = not finalized or no entries)
    function winnerOf(uint32 day) external view returns (uint256) {
        return _winner[day];
    }

    /// @return lookId + 1 that `who` entered on `day` (0 = none)
    function enteredLook(uint32 day, address who) external view returns (uint256) {
        return _enteredLook[day][who];
    }

    /// @return lookId + 1 that `who` voted for on `day` (0 = none)
    function votedFor(uint32 day, address who) external view returns (uint256) {
        return _votedFor[day][who];
    }

    function crownedDaysCount() external view returns (uint256) {
        return _crownedDays.length;
    }

    /// @notice Most recent crowned days first, with the winning look.
    function recentWinners(uint256 count)
        external
        view
        returns (uint32[] memory days_, uint256[] memory lookIds, Look[] memory items)
    {
        uint256 n = _crownedDays.length;
        if (count > n) count = n;
        days_ = new uint32[](count);
        lookIds = new uint256[](count);
        items = new Look[](count);
        for (uint256 i; i < count; i++) {
            uint32 d = _crownedDays[n - 1 - i];
            uint256 id = _winner[d] - 1;
            days_[i] = d;
            lookIds[i] = id;
            items[i] = looks[id];
        }
    }

    /// @return looksSaved, crownsAwarded, entriesTotal, votesTotal
    function stats() external view returns (uint256, uint256, uint256, uint256) {
        return (looks.length, _crownedDays.length, totalEntries, totalVotes);
    }
}
