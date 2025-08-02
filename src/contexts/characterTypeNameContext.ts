import makeStore from "./makeStore";

type State = string;

type Action =
  | {
      type: "UPDATE_CHARACTER_TYPE_NAME";
      payload: string;
    };

const initialState: State = "キャラ";

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "UPDATE_CHARACTER_TYPE_NAME":
      return action.payload;
    default:
      return state;
  }
};

const [
  CharacterTypeNameProvider,
  useCharacterTypeNameStore,
  useCharacterTypeNameDispatch,
] = makeStore(reducer, initialState);

export {
  CharacterTypeNameProvider,
  useCharacterTypeNameStore,
  useCharacterTypeNameDispatch,
};
