// Languages a blog post or Free Guide can be written in.
export const BLOG_LANGUAGES = [
  { code: 'ta', label: 'தமிழ்', english: 'Tamil' },
  { code: 'ml', label: 'മലയാളം', english: 'Malayalam' },
  { code: 'kn', label: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'te', label: 'తెలుగు', english: 'Telugu' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi' },
  { code: 'en', label: 'English', english: 'English' },
];

// Language names are shown in English (Tamil, Malayalam, ...) on the site
export const languageLabel = (code) => BLOG_LANGUAGES.find(l => l.code === code)?.english || 'English';

// Fixed words on the Free Guide page, in the page's language
const GUIDE_WORDS = {
  ta: { page: 'பக்கம்', readIn: 'மற்ற மொழிகளில்', back: 'Blog', whatsapp: 'சந்தேகமா? WhatsApp பண்ணுங்க', free: 'இலவசம்' },
  ml: { page: 'പേജ്', readIn: 'മറ്റ് ഭാഷകളിൽ', back: 'Blog', whatsapp: 'സംശയമുണ്ടോ? WhatsApp ചെയ്യൂ', free: 'സൗജന്യം' },
  kn: { page: 'ಪುಟ', readIn: 'ಇತರ ಭಾಷೆಗಳಲ್ಲಿ', back: 'Blog', whatsapp: 'ಸಂದೇಹವಿದೆಯೇ? WhatsApp ಮಾಡಿ', free: 'ಉಚಿತ' },
  te: { page: 'పేజీ', readIn: 'ఇతర భాషల్లో', back: 'Blog', whatsapp: 'సందేహమా? WhatsApp చేయండి', free: 'ఉచితం' },
  hi: { page: 'पेज', readIn: 'अन्य भाषाओं में', back: 'Blog', whatsapp: 'कोई सवाल? WhatsApp करें', free: 'मुफ़्त' },
  en: { page: 'Page', readIn: 'Also in', back: 'Blog', whatsapp: 'Questions? WhatsApp us', free: 'Free' },
};

export const guideWords = (code) => GUIDE_WORDS[code] || GUIDE_WORDS.en;
