import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

export interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

interface WebViewContainerProps {
  uri: string;
  onMessage: (event: WebViewMessageEvent) => void;
  onLoadEnd?: () => void;
}

const INITIAL_SCRIPT = `
  (function() {
    if (!window.ReactNativeWebView) {
      throw new Error('ReactNativeWebView not available');
    }

    window.handshake = function() {
      const channel = new MessageChannel();
      window.messagePort = channel.port1;
      window.postMessage({ type: "handshake", messageId: "handshake" }, "*", [channel.port2]);
      window.messagePort.onmessage = (event) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: event.data.type,
          messageId: event.data.messageId || null,
          data: event.data.data
        }));
      };
    };

    window.sendMessage = function(type, messageId, data) {
      if (!window.messagePort) {
        throw new Error('MessagePort not initialized');
      }
      window.messagePort.postMessage({ type, messageId, data });
    };

    window.handshake();
  })();
  true;
`;

export const WebViewContainer = forwardRef<
  WebViewHandle,
  WebViewContainerProps
>(({ uri, onMessage, onLoadEnd }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const isInitialized = useRef(false);

  const injectInitialScript = () => {
    if (isInitialized.current) return;
    webViewRef.current?.injectJavaScript(INITIAL_SCRIPT);
    isInitialized.current = true;
  };

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script: string) => {
      webViewRef.current?.injectJavaScript(script);
    },
  }));

  return (
    <WebView
      javaScriptEnabled
      ref={webViewRef}
      source={{ uri }}
      onLoadEnd={() => {
        injectInitialScript();
        onLoadEnd?.();
      }}
      onMessage={onMessage}
    />
  );
});

WebViewContainer.displayName = 'WebViewContainer';
