import { type Wallet, getAddress, verifyMessage } from 'ethers';
import { getCredentialPublicAddress, getCredentialSignerWallet } from './config';

type SerializableValue =
  | boolean
  | null
  | number
  | string
  | SerializableValue[]
  | { [key: string]: SerializableValue };

function normalizeValue(value: unknown): SerializableValue {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, SerializableValue>;

    return Object.keys(value)
      .sort()
      .reduce<Record<string, SerializableValue>>((result, key) => {
        const entry = record[key];
        if (entry !== undefined) {
          result[key] = normalizeValue(entry);
        }
        return result;
      }, {});
  }

  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }

  throw new TypeError('Credential payload contains unsupported value types');
}

export function serializeCredentialPayload(payload: unknown): string {
  return JSON.stringify(normalizeValue(payload));
}

export async function signCredential(
  payload: unknown,
  signer: Wallet = getCredentialSignerWallet()
): Promise<string> {
  return signer.signMessage(serializeCredentialPayload(payload));
}

export async function verifyCredentialSignature(
  payload: unknown,
  signature: string,
  expectedAddress = getCredentialPublicAddress()
): Promise<boolean> {
  const recoveredAddress = verifyMessage(serializeCredentialPayload(payload), signature);

  return getAddress(recoveredAddress) === getAddress(expectedAddress);
}
