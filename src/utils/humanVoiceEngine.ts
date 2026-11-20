// Smooth, soothing, and fluent human voice engine
// Delivers warm, gentle, and beautiful speech with fluent speed (0.95)

interface SoothingVoiceOptions {
  language: 'Hindi' | 'English';
  rate?: number; // 0.95 - fluent, pleasant, and crisp (na zyada tez, na zyada dheemi)
  pitch?: number; // 1.01 - natural, sweet, friendly resonance
  volume?: number;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const available = window.speechSynthesis.getVoices();
    if (available && available.length > 0) {
      cachedVoices = available;
      resolve(available);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };

    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 150);
  });
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
}

export const getSoothingVoice = async (
  language: 'Hindi' | 'English'
): Promise<SpeechSynthesisVoice | null> => {
  const voices = cachedVoices.length > 0 ? cachedVoices : await loadVoices();
  if (!voices || voices.length === 0) return null;

  if (language === 'Hindi') {
    const hindiVoice = voices.find(
      (v) =>
        (v.lang.toLowerCase().startsWith('hi') || v.lang.includes('IN')) &&
        (v.name.includes('Google') ||
          v.name.includes('Swara') ||
          v.name.includes('Kalpana') ||
          v.name.includes('Natural') ||
          v.name.includes('Neural'))
    );
    if (hindiVoice) return hindiVoice;

    const anyHindi = voices.find((v) => v.lang.toLowerCase().startsWith('hi'));
    if (anyHindi) return anyHindi;
  } else {
    const priorityNames = [
      'google uk english female',
      'google us english',
      'natural',
      'samantha',
      'jenny',
      'aria',
      'karen',
      'serena',
      'victoria',
      'moira',
    ];

    for (const name of priorityNames) {
      const match = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en') &&
          v.name.toLowerCase().includes(name)
      );
      if (match) return match;
    }

    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (anyEn) return anyEn;
  }

  return voices[0] || null;
};

export const speakSoothingVoice = async (
  text: string,
  options: SoothingVoiceOptions
) => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const selectedVoice = await getSoothingVoice(options.language);
    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = options.language === 'Hindi' ? 'hi-IN' : 'en-US';
    }

    // Rate 0.95: slightly faster, fluent, articulate, and natural
    // Pitch 1.01: sweet, warm, pleasant
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1.01;
    utterance.volume = Math.max(0.01, Math.min(1, options.volume ?? 0.85));

    window.speechSynthesis.speak(utterance);
  } catch {
    // graceful fallback
  }
};
