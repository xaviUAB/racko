
let audioContext: AudioContext | null = null;

export const initAudio = (): void => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported. Sounds will be disabled.", e);
        }
    }
};

export const playBeep = (): void => {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
};

export const playWinMelody = (): void => {
    if (!audioContext) return;
    const tempo = 120;
    const quarterNote = 60 / tempo;

    const melody = [
        { freq: 660, duration: quarterNote * 0.5 },
        { freq: 784, duration: quarterNote * 0.5 },
        { freq: 988, duration: quarterNote * 1.5 }
    ];

    let time = audioContext.currentTime;

    melody.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(note.freq, time);
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.linearRampToValueAtTime(0.001, time + note.duration);
        oscillator.start(time);
        oscillator.stop(time + note.duration);
        time += note.duration;
    });
};

export const vibrate = (pattern: VibratePattern = [200]): void => {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};
