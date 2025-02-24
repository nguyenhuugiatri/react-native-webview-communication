import React, { useRef, useEffect, useState } from 'react';
import { View, Button, Alert } from 'react-native';
import WebView from 'react-native-webview';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const isConnectionReadyRef = useRef<Boolean>(false);

  const injectScript = () => {
    if (isConnectionReadyRef.current) return;

    webViewRef.current?.injectJavaScript(`
      (function() {
        if (!window.ReactNativeWebView) return;

        const channel = new MessageChannel();
        window.messagePort = channel.port1;

        window.messagePort.onmessage = (msg) => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage("Received from iframe: " + msg.data);
          }
        };

        window.messagePort.start();
        window.postMessage({ type: "iframe_ready" }, "*", [channel.port2]);
        window.ReactNativeWebView.postMessage("MessageChannel initialized");

        window.sendPing = function() {
          if (window.messagePort) {
            window.messagePort.postMessage("ping");
          } else {
            window.ReactNativeWebView.postMessage("Error: messagePort is not set");
          }
        };
      })();
      true;
    `);

    isConnectionReadyRef.current = true;
  };

  const sendPing = () => {
    if (!isConnectionReadyRef.current) {
      return;
    }
    webViewRef.current?.injectJavaScript('sendPing(); true;');
  };

  return (
    <View
      style={{
        height: 300,
      }}
    >
      <WebView
        javaScriptEnabled
        ref={webViewRef}
        style={{ width: 0, height: 0 }}
        source={{ uri: 'http://localhost:3000' }}
        onLoadEnd={() => {
          injectScript();
          isConnectionReadyRef.current = true;
        }}
        onMessage={(event) => alert(event.nativeEvent.data)}
      />
      <Button title="Send Ping" onPress={sendPing} />
    </View>
  );
}
