// Just a demo, run it on your own server

import { WebMessage } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const messagePortRef = useRef<MessagePort | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(
    'Waiting for connection'
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'handshake' && event.ports.length > 0) {
        const port = event.ports[0];
        messagePortRef.current = port;

        port.onmessage = (msg: MessageEvent<WebMessage>) => {
          const { type, messageId, data } = msg.data;

          switch (type) {
            case 'wallet': {
              setConnectionStatus('Signing');
              setTimeout(() => {
                port.postMessage({
                  type: 'wallet',
                  messageId,
                  data: {
                    ...data,
                    signature:
                      '0xab3eb04e408a48a0131bd8635186cd8bf2ad3b0cf37422d5681b388c2d8f1af93940cd7af15609e03b8de8c4ac259c2595bb6cb33eb31f206bccae803e782ebc1b',
                  },
                });
                setConnectionStatus('Signing susscessfully');
              }, 1_000);
              break;
            }
          }
        };

        port.postMessage({
          type: 'handshake',
          messageId: event.data.messageId,
        });
        setConnectionStatus('Connected');

        port.start();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div>
      <h1>WebView</h1>
      <p>Status: {connectionStatus}</p>
    </div>
  );
}
