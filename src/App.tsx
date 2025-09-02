import { KeywordsProvider } from "./contexts/keywordsContext";
import { KeywordTypesProvider } from "./contexts/keywordTypesContext";
import { DefaultCharactersProvider } from "./contexts/defaultsContext";
import { PromptGeneratorsProvider } from "./contexts/promptGeneratorsContext";
import { CharacterTypeNameProvider } from "./contexts/characterTypeNameContext";
import Workspace from "./Workspace";

function App() {
  return (
    <KeywordsProvider>
      <KeywordTypesProvider>
        <DefaultCharactersProvider>
          <PromptGeneratorsProvider>
            <CharacterTypeNameProvider>
              <Workspace />
            </CharacterTypeNameProvider>
          </PromptGeneratorsProvider>
        </DefaultCharactersProvider>
      </KeywordTypesProvider>
    </KeywordsProvider>
  );
}

export default App;
