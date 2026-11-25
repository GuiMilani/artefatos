// The site is written in Portuguese. Visitors whose device language is not
// Portuguese see the labels below in English instead; anything missing from
// the list stays as written. Add a line here for every new media type or
// caption that should follow the device language.

const EN: Record<string, string> = {
  // media types
  'foto': 'photo',
  'foto ds': 'ds photo',
  'filme': 'film',
  'scan': 'scan',
  'som': 'sound',
  'música': 'music',
  'áudio': 'audio',
  'texto': 'text',
  'vídeo': 'video',
  '3d': '3d',
  // captions
  'scanner de mão': 'hand scanner',
  'nintendo ds': 'nintendo ds',
  '35mm': '35mm',
  'bem vindo': 'welcome',
  // interface
  'índice': 'index',
};

/** English version of a Portuguese label, or the label itself. */
export function en(pt: string): string {
  return EN[pt.trim().toLowerCase()] ?? pt;
}
