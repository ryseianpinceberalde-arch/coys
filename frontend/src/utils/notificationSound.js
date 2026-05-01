let audioContext = null;
let audioElement = null;
const SOUND_URL = "/sounds/notification.wav";

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

const getAudioElement = () => {
  if (typeof window === "undefined" || typeof window.Audio !== "function") {
    return null;
  }

  if (!audioElement) {
    audioElement = new window.Audio(SOUND_URL);
    audioElement.preload = "auto";
  }

  return audioElement;
};

export const playNotificationSound = async () => {
  try {
    const audio = getAudioElement();
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch {
        // Fall back to synthesized audio below if file playback is blocked.
      }
    }

    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.16);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  } catch {
    // Browsers can block audio until the user interacts with the page.
  }
};
