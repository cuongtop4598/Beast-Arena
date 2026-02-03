import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { ControlsOverlay } from './ControlsOverlay';

const GAME_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #0a0a0a; overflow: hidden; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    // Game state received from React Native
    let gameState = null;

    // Listen for messages from React Native
    window.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'gameState') gameState = msg.state;
        if (msg.type === 'command') handleCommand(msg);
      } catch(err) {}
    });

    function handleCommand(msg) {
      // Handle commands from React Native side
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ack', id: msg.id }));
    }

    // 60fps render loop
    let lastTime = 0;
    function render(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      if (gameState) {
        // Render game based on state
        renderGame(ctx, gameState, dt);
      } else {
        // Loading screen
        ctx.fillStyle = '#ff6b35';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BEAST ARENA', canvas.width / window.devicePixelRatio / 2, canvas.height / window.devicePixelRatio / 2);
        ctx.fillStyle = '#888';
        ctx.font = '18px sans-serif';
        ctx.fillText('Initializing...', canvas.width / window.devicePixelRatio / 2, canvas.height / window.devicePixelRatio / 2 + 40);
      }

      requestAnimationFrame(render);
    }

    function renderGame(ctx, state, dt) {
      // Placeholder render - will be replaced with full engine
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      
      // Ground
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, h * 0.75, w, h * 0.25);
      
      // Arena text
      ctx.fillStyle = '#333';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ ARENA ⚔️', w/2, h * 0.78 + 20);
    }

    requestAnimationFrame(render);
  </script>
</body>
</html>
`;

interface GameViewProps {
  onInput?: (input: Record<string, boolean>) => void;
}

export function GameView({ onInput }: GameViewProps) {
  const webViewRef = useRef<WebView>(null);
  const { width, height } = Dimensions.get('window');

  const sendGameState = useCallback((state: unknown) => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'gameState', state })
    );
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'input') onInput?.(msg.data);
    } catch { /* ignore */ }
  }, [onInput]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: GAME_HTML }}
        style={[styles.webview, { width, height }]}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <ControlsOverlay />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export { sendGameState } from './GameView';
