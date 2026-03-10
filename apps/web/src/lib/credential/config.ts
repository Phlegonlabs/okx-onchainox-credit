import { SigningKey, Wallet, isAddress } from 'ethers';

function readConfiguredValue(envName: 'ECDSA_PRIVATE_KEY' | 'ECDSA_PUBLIC_ADDRESS'): string {
  const value = process.env[envName]?.trim();

  if (!value || value === 'placeholder') {
    throw new Error(`${envName} must be configured`);
  }

  return value;
}

export function getCredentialPrivateKey(): string {
  const privateKey = readConfiguredValue('ECDSA_PRIVATE_KEY');

  try {
    new SigningKey(privateKey);
  } catch {
    throw new Error('ECDSA_PRIVATE_KEY must be a valid secp256k1 private key');
  }

  return privateKey;
}

export function getCredentialPublicAddress(): string {
  const address = readConfiguredValue('ECDSA_PUBLIC_ADDRESS');

  if (!isAddress(address)) {
    throw new Error('ECDSA_PUBLIC_ADDRESS must be a valid EVM address');
  }

  return address;
}

export function getCredentialSignerWallet(): Wallet {
  const privateKey = getCredentialPrivateKey();
  const expectedAddress = getCredentialPublicAddress();
  const wallet = new Wallet(privateKey);

  if (wallet.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error('ECDSA_PUBLIC_ADDRESS does not match ECDSA_PRIVATE_KEY');
  }

  return wallet;
}
