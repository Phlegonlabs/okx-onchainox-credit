export class AppError extends Error {
  code: string;
  details?: unknown;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'x402 payment required', details?: unknown) {
    super(message, 'PAYMENT_REQUIRED', 402, details);
  }
}

export class PaymentVerificationError extends AppError {
  constructor(message = 'x402 payment verification failed', details?: unknown) {
    super(message, 'INVALID_PAYMENT', 402, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input', details?: unknown) {
    super(message, 'INVALID_INPUT', 400, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details?: unknown) {
    super(message, 'RATE_LIMITED', 429, details);
  }
}

export function toErrorBody(error: AppError): {
  error: { code: string; details?: unknown; message: string };
} {
  return {
    error: {
      code: error.code,
      details: error.details,
      message: error.message,
    },
  };
}
