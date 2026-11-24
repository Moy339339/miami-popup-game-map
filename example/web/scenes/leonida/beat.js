// Beat: soundtrack is M83 "Midnight City", 105 BPM, 4/4. Frame 0 of the film = the first beat of the song's first bar (audio starts at 0.110 s).
// Song structure (by bar, counting from 0): 0-6 intro (only the synth melody, no drums); 7 drums come in (16.0 s); 7-15 the long section before the verse; from 16 the verse "Waiting in a car" (36.6 s).
export const BEAT = 60 / 105, EIGHTH = BEAT / 2, BAR = BEAT * 4, HALF = BAR / 2;
export const DROP = 7 * BAR;     // drums come in
export const VERSE = 16 * BAR;   // verse comes in
