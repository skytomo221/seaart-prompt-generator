import { KeywordsProvider } from "./contexts/keywordsContext";
import { DefaultCharactersProvider } from "./contexts/defaultsContext";
import { PromptGeneratorsProvider } from "./contexts/promptGeneratorsContext";
import { CharacterTypeNameProvider } from "./contexts/characterTypeNameContext";
import Workspace from "./Workspace";

function App() {
  return (
    <KeywordsProvider>
      <DefaultCharactersProvider>
        <PromptGeneratorsProvider>
          <CharacterTypeNameProvider>
            <Workspace />
          </CharacterTypeNameProvider>
        </PromptGeneratorsProvider>
      </DefaultCharactersProvider>
    </KeywordsProvider>
  );
}

export default App;
