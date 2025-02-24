import React, { useRef, useState, useCallback } from 'react';
import { View, Button, Alert } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

type WebMessage = {
  type: 'handshake' | 'ping' | 'pong' | 'error';
  data?: string;
};

export default function HomeScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const hasInjectedScript = useRef(false);

  const injectScript = useCallback(() => {
    if (hasInjectedScript.current || isConnected) return;

    webViewRef.current?.injectJavaScript(`
      (function() {
        if (!window.ReactNativeWebView) {
          console.error('ReactNativeWebView not available');
          return;
        }

        try {
          if (window.messagePort) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "error",
              data: "MessagePort already initialized"
            }));
            return;
          }

          const channel = new MessageChannel();
          window.messagePort = channel.port1;

          window.messagePort.onmessage = (event) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: event.data.type,
              data: event.data.data
            }));
          };

          window.postMessage({ type: "handshake" }, "*", [channel.port2]);

          window.sendMessage = function(type, data) {
            if (!window.messagePort) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "error",
                data: "MessagePort not initialized"
              }));
              return;
            }
            window.messagePort.postMessage({ type, data });
          };
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "error",
            data: error.message
          }));
        }
      })();
      true;
    `);

    hasInjectedScript.current = true;
  }, [isConnected]);

  const sendMessage = useCallback(
    (type: WebMessage['type'], data?: string) => {
      if (!isConnected) {
        Alert.alert('Error', 'Connection not established yet');
        return;
      }
      webViewRef.current?.injectJavaScript(`
      window.sendMessage('${type}', '${data || ''}');
      true;
    `);
    },
    [isConnected]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message: WebMessage = JSON.parse(event.nativeEvent.data);
        switch (message.type) {
          case 'handshake':
            if (!isConnected) {
              setIsConnected(true);
              Alert.alert('Success', message.data || 'Connection established');
            }
            break;
          case 'pong':
            Alert.alert('Response', message.data || 'pong');
            break;
          case 'error':
            Alert.alert('Error', message.data || 'Unknown error');
            break;
          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Message handling error:', error);
        Alert.alert('Error', 'Failed to parse message');
      }
    },
    [isConnected]
  );

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <View style={{ width: 0, height: 0 }}>
        <WebView
          javaScriptEnabled
          ref={webViewRef}
          source={{ uri: 'http://localhost:3000' }}
          onLoadEnd={injectScript}
          onMessage={handleMessage}
          onError={(syntheticEvent) => {
            Alert.alert(
              'WebView Error',
              syntheticEvent.nativeEvent.description
            );
          }}
        />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Button
          title="Send Ping"
          onPress={() => sendMessage('ping')}
          disabled={!isConnected}
        />
      </View>
    </View>
  );
}
