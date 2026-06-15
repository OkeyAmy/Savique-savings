// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./PersonalVault.sol";

/**
 * @title VaultFactory
 * @dev Deploys Aave-integrated Personal Vaults on Arbitrum Sepolia.
 */
contract VaultFactory is Ownable {
    using SafeERC20 for IERC20;

    address public immutable usdcToken;
    address public immutable aavePool; 
    address public protocolTreasury;
    address public immutable implementation;

    uint256 public nextVaultId = 1;

    mapping(uint256 => address) public vaultById;
    mapping(address => bool) public isVault;
    mapping(address => address[]) public userVaults;
    address[] public allVaults;

    event VaultCreated(address indexed user, address vault, uint256 vaultId, string purpose);

    constructor(
        address _usdcToken, 
        address _aavePool, 
        address _protocolTreasury,
        address _implementation
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC");
        require(_implementation != address(0), "Invalid Implementation");
        
        usdcToken = _usdcToken;
        aavePool = _aavePool;
        protocolTreasury = _protocolTreasury;
        implementation = _implementation;
    }

    function createPersonalVault(
        string memory _purpose,
        uint256 _unlockTimestamp,
        uint256 _penaltyBps,
        uint256 _initialDeposit,
        address _beneficiary
    ) external returns (address) {
        uint256 vaultId = nextVaultId++;
        
        // Clone the implementation (Minimal Proxy)
        address vaultAddr = Clones.clone(implementation);
        
        // Initialize the clone
        PersonalVault(payable(vaultAddr)).initialize(
            usdcToken,
            aavePool,
            _purpose,
            _unlockTimestamp,
            _penaltyBps,
            protocolTreasury,
            _beneficiary,
            vaultId,
            msg.sender
        );

        vaultById[vaultId] = vaultAddr;
        isVault[vaultAddr] = true;
        userVaults[msg.sender].push(vaultAddr);
        allVaults.push(vaultAddr);

        if (_initialDeposit > 0) {
            IERC20(usdcToken).safeTransferFrom(msg.sender, address(this), _initialDeposit);
            IERC20(usdcToken).safeTransfer(vaultAddr, _initialDeposit);
            PersonalVault(payable(vaultAddr)).depositFromFactory(_initialDeposit);
        }

        emit VaultCreated(msg.sender, vaultAddr, vaultId, _purpose);
        return vaultAddr;
    }

    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }

    function triggerBeneficiaryClaim(address _vault) external onlyOwner {
        PersonalVault(payable(_vault)).claimByBeneficiary();
    }
}
