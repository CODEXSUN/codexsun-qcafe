import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ValidationError } from './errors.mjs';

export class CertificateAggregate {
  constructor(state) {
    this.state = state;
  }

  static issue(input) {
    const email = input.studentEmail?.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new ValidationError('Valid student email required.');
    if (!input.courseUuid) throw new ValidationError('Course UUID is required.');
    if (typeof input.gradePercentage !== 'number' || input.gradePercentage < 60) {
      throw new ValidationError('A passing grade percentage (>= 60%) is required to earn a certificate.');
    }

    const code = `NEOT-${randomBytes(4).toString('hex').toUpperCase()}-${new Date().getFullYear()}`;
    const issuedAt = new Date().toISOString();
    const verificationHash = createHash('sha256')
      .update(`${code}:${input.courseUuid}:${email}:${issuedAt}`)
      .digest('hex');

    return new CertificateAggregate({
      id: 0,
      uuid: randomUUID().replace(/-/g, ''),
      courseUuid: input.courseUuid,
      studentEmail: email,
      certificateCode: code,
      gradePercentage: input.gradePercentage,
      issuedAt,
      verificationHash,
    });
  }

  static restore(state) {
    return new CertificateAggregate(structuredClone(state));
  }

  get certificateCode() { return this.state.certificateCode; }
  get verificationHash() { return this.state.verificationHash; }

  snapshot() {
    return structuredClone(this.state);
  }
}
