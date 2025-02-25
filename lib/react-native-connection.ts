import { useCallback, useEffect, useRef } from 'react';
import uuid from 'react-native-uuid';
import { WebViewMessageEvent } from 'react-native-webview';
import { Deferred } from './defer';
import { ConnectionError, WebMessage } from './types';
import { WebViewManager } from './webview-manager';

const CONNECTION_TIMEOUT = 5_000;
const MESSAGE_TIMEOUT = 10_000;

export class WebConnectionRN {
  private manager: WebViewManager;
  private isConnected = false;
  private messageQueue: Map<string, Deferred> = new Map();
  private resolveConnection?: (value: boolean) => void;
  private rejectConnection?: (reason: unknown) => void;

  constructor() {
    this.manager = WebViewManager.getInstance();
  }

  connect = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }
      this.resolveConnection = resolve;
      this.rejectConnection = reject;
      const handshakeScript = `
        window.handshake();
        true;
      `;
      this.manager.injectJavaScript(handshakeScript);
      setTimeout(
        () => reject(new ConnectionError('Connection timeout')),
        CONNECTION_TIMEOUT
      );
    });
  };

  disconnect = () => {
    this.isConnected = false;
    this.messageQueue.forEach((deferred) => deferred.dispose());
    this.messageQueue.clear();
    this.rejectConnection?.(new ConnectionError('Disconnected'));
  };

  async sendMessage<T>(message: WebMessage<T>): Promise<T> {
    if (!this.isConnected) await this.connect();

    const messageId = uuid.v4().toString();
    const messageData = {
      ...message,
      messageId,
      data: message.data ?? null,
    };
    const messageHandler = new Deferred<T>(MESSAGE_TIMEOUT);
    this.messageQueue.set(messageId, messageHandler);

    const script = `
      window.sendMessage('${message.type}', '${messageId}', ${JSON.stringify(
      messageData.data
    )});
      true;
    `;
    this.manager.injectJavaScript(script);
    return messageHandler.promise;
  }

  private handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: WebMessage = JSON.parse(event.nativeEvent.data);
      const { type, messageId, data } = message;

      const handlers: Record<string, () => void> = {
        handshake: () => {
          if (!this.isConnected) {
            this.isConnected = true;
            this.resolveConnection?.(true);
          }
        },
        error: () =>
          this.handleResponse(messageId, () => {
            throw new ConnectionError(
              data?.message || 'Unknown error',
              data?.code
            );
          }),
        default: () => this.handleResponse(messageId, () => data),
      };

      const handler = handlers[type] || handlers.default;
      handler();
    } catch (error) {
      console.error('Message handling error:', error);
    }
  };

  private handleResponse = (
    messageId: string | undefined,
    action: () => any
  ) => {
    if (!messageId) return;
    const messageHandler = this.messageQueue.get(messageId);
    if (!messageHandler) return;

    this.messageQueue.delete(messageId);
    try {
      const result = action();
      if (result instanceof Error) {
        messageHandler.reject(result);
      } else {
        messageHandler.resolve(result);
      }
    } catch (error) {
      messageHandler.reject(error);
    }
  };

  addMessageListener = () => {
    this.manager.addMessageListener(this.handleMessage);
  };

  removeMessageListener = () => {
    this.manager.removeMessageListener(this.handleMessage);
  };
}

export const useWebConnectionRN = () => {
  const connectionRef = useRef(new WebConnectionRN());

  const sendMessage = useCallback(
    async <T>(message: Omit<WebMessage<T>, 'messageId'>): Promise<T> => {
      const normalizedMessage = {
        messageId: uuid.v4(),
        ...message,
      } as WebMessage<T>;
      return connectionRef.current.sendMessage<T>(normalizedMessage);
    },
    []
  );

  useEffect(() => {
    connectionRef.current.addMessageListener();
    return () => {
      connectionRef.current.removeMessageListener();
      connectionRef.current.disconnect();
    };
  }, []);

  return {
    sendMessage,
  };
};
