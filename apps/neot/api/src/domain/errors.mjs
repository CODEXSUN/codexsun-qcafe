export class NeotDomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'NeotDomainError';
    this.code = code;
  }
}

export class NotFoundError extends NeotDomainError {
  constructor(entity, identifier) {
    super(`${entity} with identifier "${identifier}" was not found.`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends NeotDomainError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends NeotDomainError {
  constructor(message = 'Unauthorized operation.') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
