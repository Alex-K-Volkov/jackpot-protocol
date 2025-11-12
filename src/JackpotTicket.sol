// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title JackpotTicket
 * @author Alex K. Volkov
 * @notice A self-contained, lightweight NFT contract for lottery tickets.
 */
contract JackpotTicket {
    string public name = "Jackpot Protocol Ticket";
    string public symbol = "JPT";

    address public owner;
    uint256 private _nextTokenId;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        require(_owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[_owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "ERC721: invalid token ID");
        return tokenOwner;
    }

    function mintTicket(address player) external onlyOwner returns (uint256) {
        require(player != address(0), "ERC721: mint to the zero address");
        
        uint256 tokenId = _nextTokenId;
        _owners[tokenId] = player;
        _balances[player]++;
        
        emit Transfer(address(0), player, tokenId);
        
        _nextTokenId++;
        return tokenId;
    }

    function getTotalTickets() public view returns (uint256) {
        return _nextTokenId;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        owner = newOwner;
    }
}
