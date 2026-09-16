import { SnippetDefinition } from '../extensionTypes'

// 1. Solidity Snippets
export const SOLIDITY_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'solidity-erc20-reentrancy',
    detail: 'Solidity: Production ERC-20 Token with ReentrancyGuard & Custom Errors',
    documentation: 'OpenZeppelin-aligned Solidity 0.8.26+ contract with custom errors and ReentrancyGuard',
    insertText: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\nimport "@openzeppelin/contracts/token/ERC20/ERC20.sol";\nimport "@openzeppelin/contracts/access/Ownable.sol";\nimport "@openzeppelin/contracts/utils/ReentrancyGuard.sol";\n\nerror ZeroAddress();\nerror InsufficientLiquidity(uint256 available, uint256 requested);\n\ncontract ${1:LiquidGlassToken} is ERC20, Ownable, ReentrancyGuard {\n    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;\n\n    event SpecularMined(address indexed recipient, uint256 amount);\n\n    constructor(address initialOwner)\n        ERC20("Liquid Glass Token", "GLAS")\n        Ownable(initialOwner)\n    {\n        _mint(initialOwner, 10_000_000 * 10 ** 18);\n    }\n\n    function mint(address to, uint256 amount) external onlyOwner nonReentrant {\n        if (to == address(0)) revert ZeroAddress();\n        if (totalSupply() + amount > MAX_SUPPLY) {\n            revert InsufficientLiquidity(MAX_SUPPLY - totalSupply(), amount);\n        }\n        _mint(to, amount);\n        emit SpecularMined(to, amount);\n    }\n}\n$0',
  },
  {
    label: 'foundry-test-contract',
    detail: 'Foundry (Solidity): Unit Test with forge-std/Test.sol',
    documentation: 'Foundry test contract with setUp(), vm.prank, and assertEq assertions',
    insertText: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\nimport "forge-std/Test.sol";\nimport "../src/${1:LiquidGlassToken}.sol";\n\ncontract ${1:LiquidGlassToken}Test is Test {\n    ${1:LiquidGlassToken} public token;\n    address public owner = address(0xABCD);\n    address public user = address(0x1234);\n\n    function setUp() public {\n        vm.prank(owner);\n        token = new ${1:LiquidGlassToken}(owner);\n    }\n\n    function test_InitialSupply() public view {\n        assertEq(token.totalSupply(), 10_000_000 * 10 ** 18);\n        assertEq(token.balanceOf(owner), 10_000_000 * 10 ** 18);\n    }\n\n    function test_MintAsOwner() public {\n        vm.prank(owner);\n        token.mint(user, 100 * 10 ** 18);\n        assertEq(token.balanceOf(user), 100 * 10 ** 18);\n    }\n}\n$0',
  },
]

// 2. Move Snippets (Aptos / Sui)
export const MOVE_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'move-module-resource',
    detail: 'Move (Sui / Aptos): Resource Module with Capabilities',
    documentation: 'Move module with struct key/store abilities, entry functions, and transfer',
    insertText: 'module ${1:indoctrinated}::${2:glass_asset} {\n    use sui::object::{Self, UID};\n    use sui::transfer;\n    use sui::tx_context::{Self, TxContext};\n\n    public struct ${3:GlassBadge} has key, store {\n        id: UID,\n        sheen_factor: u64,\n        creator: address,\n    }\n\n    public entry fun mint_badge(sheen: u64, ctx: &mut TxContext) {\n        let badge = ${3:GlassBadge} {\n            id: object::new(ctx),\n            sheen_factor: sheen,\n            creator: tx_context::sender(ctx),\n        };\n        transfer::public_transfer(badge, tx_context::sender(ctx));\n    }\n}\n$0',
  },
]

// 3. Cairo Snippets (Starknet ZK)
export const CAIRO_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'cairo-starknet-contract',
    detail: 'Cairo (Starknet): #[starknet::contract] with Storage & Events',
    documentation: 'Cairo 2.x Starknet smart contract with component traits and storage mapping',
    insertText: '#[starknet::interface]\npub trait I${1:GlassRegistry}<TContractState> {\n    fn get_sheen_score(self: @TContractState, account: starknet::ContractAddress) -> u256;\n    fn set_sheen_score(ref self: TContractState, score: u256);\n}\n\n#[starknet::contract]\npub mod ${1:GlassRegistry} {\n    use starknet::ContractAddress;\n    use starknet::get_caller_address;\n\n    #[storage]\n    struct Storage {\n        scores: LegacyMap<ContractAddress, u256>,\n    }\n\n    #[abi(embed_v0)]\n    impl ${1:GlassRegistry}Impl of super::I${1:GlassRegistry}<ContractState> {\n        fn get_sheen_score(self: @ContractState, account: ContractAddress) -> u256 {\n            self.scores.read(account)\n        }\n\n        fn set_sheen_score(ref self: ContractState, score: u256) {\n            let caller = get_caller_address();\n            self.scores.write(caller, score);\n        }\n    }\n}\n$0',
  },
]

// 4. Vyper Snippets
export const VYPER_SNIPPETS: SnippetDefinition[] = [
  {
    label: 'vyper-vault-contract',
    detail: 'Vyper 0.4+: Secure Vault Contract with @nonreentrant',
    documentation: 'Pythonic smart contract in Vyper with immutable state and nonreentrant decorator',
    insertText: '# @version ^0.4.0\n\n"""\n@title Liquid Glass Secure Asset Vault\n@license MIT\n"""\n\nevent Deposit:\n    sender: indexed(address)\n    amount: uint256\n\nevent Withdraw:\n    recipient: indexed(address)\n    amount: uint256\n\nbalances: public(HashMap[address, uint256])\nowner: public(immutable(address))\n\n@deploy\ndef __init__():\n    owner = msg.sender\n\n@external\n@payable\n@nonreentrant\ndef deposit():\n    assert msg.value > 0, "Zero deposit"\n    self.balances[msg.sender] += msg.value\n    log Deposit(msg.sender, msg.value)\n\n@external\n@nonreentrant\ndef withdraw(amount: uint256):\n    assert self.balances[msg.sender] >= amount, "Insufficient funds"\n    self.balances[msg.sender] -= amount\n    send(msg.sender, amount)\n    log Withdraw(msg.sender, amount)\n$0',
  },
]

export const WEB3_SNIPPETS: SnippetDefinition[] = [
  ...SOLIDITY_SNIPPETS,
  ...MOVE_SNIPPETS,
  ...CAIRO_SNIPPETS,
  ...VYPER_SNIPPETS,
]

export const web3Snippets = WEB3_SNIPPETS
