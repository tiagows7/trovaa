type NotificationSoundKind = "message" | "connection";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  audioContext ??= new AudioContext();
  return audioContext;
}

export function playNotificationBeep(kind: NotificationSoundKind = "message") {
  const context = getAudioContext();
  if (!context) return;

  void context.resume().then(() => {
    const now = context.currentTime;
    const beeps = kind === "connection" ? [880, 1046] : [660];

    for (const [index, frequency] of beeps.entries()) {
      const startAt = now + index * 0.16;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.15);
    }
  });
}
