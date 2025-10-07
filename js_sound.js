// js/sound.js - Web Audio API with proper mobile unlock
let audioContext;
let soundEnabled = true;
let vibrationEnabled = 'vibrate' in navigator;

export const initAudio = () => {
    if (!audioContext && soundEnabled) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Handle the audio context state for mobile browsers
            if (audioContext.state === 'suspended') {
                // This will be unlocked by user interaction
                console.log('Audio context suspended, waiting for user interaction to unlock');
            }
        } catch (e) {
            console.warn('Web Audio API not supported. Sounds will be disabled.', e);
            soundEnabled = false;
        }
    }
};

// Unlock audio context on first user interaction
export const unlockAudio = async () => {
    if (audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
            console.log('Audio context unlocked');
        } catch (e) {
            console.warn('Failed to unlock audio context:', e);
        }
    }
};

export const playBeep = () => {
    if (!audioContext || !soundEnabled || audioContext.state !== 'running') return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAt(440, audioContext.currentTime);
    
    gainNode.gain.setValueAt(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAt(0.001, audioContext.currentTime + 0.2);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
};

export const playWinMelody = () => {
    if (!audioContext || !soundEnabled || audioContext.state !== 'running') return;

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
        oscillator.frequency.setValueAt(note.freq, time);
        
        gainNode.gain.setValueAt(0.2, time);
        gainNode.gain.linearRampToValueAt(0.1, time + 0.01);
        gainNode.gain.linearRampToValueAt(0.001, time + note.duration);

        oscillator.start(time);
        oscillator.stop(time + note.duration);

        time += note.duration;
    });
};

export const vibrate = (pattern = [200]) => {
    if (vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

export const toggleSound = () => {
    soundEnabled = !soundEnabled;
    return soundEnabled;
};

export const toggleVibration = () => {
    vibrationEnabled = !vibrationEnabled;
    return vibrationEnabled;
};

export const getSoundState = () => soundEnabled;
export const getVibrationState = () => vibrationEnabled;