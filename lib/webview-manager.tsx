import { WebViewMessageEvent } from 'react-native-webview';
import { WebViewContainer, WebViewHandle } from './webview-container';
import { View } from 'react-native';

export class WebViewManager {
  private static instance: WebViewManager | null = null;
  private webViewRef: WebViewHandle | null = null;
  private messageListeners: Set<(event: WebViewMessageEvent) => void> =
    new Set();

  private constructor() {}

  public static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  setWebViewRef = (ref: WebViewHandle | null) => {
    this.webViewRef = ref;
  };

  injectJavaScript = (script: string) => {
    if (!this.webViewRef) {
      console.error('WebView ref not set, cannot inject JavaScript');
      return;
    }
    this.webViewRef.injectJavaScript(script);
  };

  addMessageListener = (listener: (event: WebViewMessageEvent) => void) => {
    if (!this.messageListeners.has(listener)) {
      this.messageListeners.add(listener);
    }
  };

  removeMessageListener = (listener: (event: WebViewMessageEvent) => void) => {
    this.messageListeners.delete(listener);
  };

  handleMessage = (event: WebViewMessageEvent) => {
    this.messageListeners.forEach((listener) => listener(event));
  };

  cleanup = () => {
    this.messageListeners.clear();
    this.webViewRef = null;
  };
}

export const WebViewRoot = ({ uri }: { uri: string }) => {
  const manager = WebViewManager.getInstance();
  return (
    <View style={{ flex: 1, paddingLeft: 40, paddingTop: 100 }}>
      <WebViewContainer
        ref={manager.setWebViewRef}
        uri={uri}
        onMessage={manager.handleMessage}
      />
    </View>
  );
};
