export interface Data {
  characterTypeName: string;
  keywords: Keyword[];
  defaults: DefaultCharacter[];
}

export interface Keyword {
  name: string;
  type: string;
  prompt: string;
  negativePrompt?: string;
}

export interface DefaultCharacter {
  character: string;
  parts: CharacterPart[];
}

export interface CharacterPart {
  type: string;
  prompt: string;
}
