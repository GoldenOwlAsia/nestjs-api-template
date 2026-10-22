import { createHash } from 'node:crypto';
import { genSalt, hash } from 'bcrypt';

interface IBcryptParams {
  salt?: string | number;
  source: string;
}

function generateSalt(characterNumber = 10): Promise<string> {
  return genSalt(characterNumber);
}

async function generateWithBcrypt({
  salt,
  source,
}: IBcryptParams): Promise<string> {
  salt = salt || (await generateSalt());

  return hash(source, salt);
}

/** Deterministic digest for high-entropy secrets (e.g. JWTs) that must be looked up, not just compared. */
function sha256(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}

export default { generateWithBcrypt, sha256 };
