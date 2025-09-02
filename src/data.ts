export interface Data {
  characterTypeName: string;
  keywords: Keyword[];
  keywordTypes: KeywordType[];
  defaults: DefaultCharacter[];
}

export interface Keyword {
  id: string;
  name: string;
  type: string;
  prompt: string;
  negativePrompt?: string;
}

export interface KeywordType {
  id: string;
  name: string;
  backgroundColor: string;
  color: string;
}

export interface DefaultCharacter {
  character: string;
  parts: CharacterPart[];
}

export interface CharacterPart {
  type: string;
  prompt: string;
}
