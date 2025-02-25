export type WebMessage<T = any> =
  | {
      type: 'handshake';
      messageId: string;
      data?: undefined;
    }
  | {
      type: 'wallet';
      messageId: string;
      data: T;
    }
  | {
      type: 'error';
      messageId: string;
      data: { message: string; code?: number };
    };

export class ConnectionError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'ConnectionError';
  }
}
