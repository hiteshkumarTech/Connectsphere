import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Lazily created singleton player so the chime is cheap to fire repeatedly.
let player = null;

function ensurePlayer() {
  if (player) return player;
  try {
    // Let the sound play even when the phone is on silent (iOS), and never
    // hold audio focus longer than needed (Android sound-effect behaviour).
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    player = createAudioPlayer(require('../assets/chime.wav'));
  } catch (e) {
    player = null;
  }
  return player;
}

// Play the new-message chime. Best-effort: never throws.
export function playChime() {
  try {
    const p = ensurePlayer();
    if (!p) return;
    p.seekTo(0); // expo-audio doesn't auto-rewind after play
    p.play();
  } catch (e) {
    // ignore — a missed chime should never break the app
  }
}
