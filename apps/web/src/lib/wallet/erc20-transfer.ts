import { encodeFunctionData, parseUnits } from 'viem';

const ERC20_TRANSFER_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const STABLECOIN_DECIMALS = 6;

export function buildErc20TransferData(recipient: string, amountUsd: string): string {
  return encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, parseUnits(amountUsd, STABLECOIN_DECIMALS)],
  });
}
