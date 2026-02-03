// ─── Game View Component ───

import React, { useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

// ─── Types ───

export interface GameViewProps {
  stageId: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode; // overlay controls
}

interface GameMessage {
  type: 'ready' | 'error' | 'fps' | 'input';
  payload?: unknown;
}

// ─── WebView HTML ───

const GAME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    #game { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="game"></div>
  <script>
    // GameCanvas initializes here in production
    // Posts messages back to React Native via window.ReactNativeWebView
    function postMsg(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
      }
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'contain';
      document.getElementById('game').appendChild(canvas);

      const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
      if (!gl) throw new Error('WebGL2 not supported');

      gl.clearColor(0.1, 0.1, 0.18, 1.0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      postMsg('ready');
    } catch (e) {
      postMsg('error', e.message);
    }
  </script>
</body>
</html>
`;

// ─── Component ───

export const GameView: React.FC<GameViewProps> = ({
  stageId,
  onReady,
  onError,
  children,
}) => {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg: GameMessage = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case 'ready':
            onReady?.();
            break;
          case 'error':
            onError?.(String(msg.payload));
            break;
        }
      } catch {
        console.warn('[GameView] Invalid message from WebView');
      }
    },
    [onReady, onError],
  );

  /** Send a command to the game WebView */
  const sendCommand = useCallback((type: string, payload?: unknown) => {
    const js = `window.dispatchGameCommand(${JSON.stringify({ type, payload })});true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const source = useMemo(() => ({ html: GAME_HTML }), []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        startInLoadingState={false}
      />
      {/* Overlay controls (joystick, buttons, HUD) */}
      <View style={styles.overlay} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
};

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default GameView;
