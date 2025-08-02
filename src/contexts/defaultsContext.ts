import { DefaultCharacter } from "../data";
import makeStore from "./makeStore";

type State = DefaultCharacter[];

type Action =
  | {
      type: "SET_DEFAULT_CHARACTERS";
      payload: DefaultCharacter[];
    }
  | {
      type: "ADD_DEFAULT_CHARACTER";
      index: number;
      payload: DefaultCharacter;
    }
  | {
      type: "REMOVE_DEFAULT_CHARACTER";
      index: number;
    }
  | {
      type: "UPDATE_DEFAULT_CHARACTER";
      index: number;
      payload: DefaultCharacter;
    }
  | {
      type: "MOVE_DEFAULT_CHARACTER";
      fromIndex: number;
      toIndex: number;
    };

const initialState: State = [];

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "SET_DEFAULT_CHARACTERS":
      return action.payload;
    case "ADD_DEFAULT_CHARACTER":
      const newState = [...state];
      newState.splice(action.index, 0, action.payload);
      return newState;
    case "REMOVE_DEFAULT_CHARACTER":
      return state.filter((_, index) => index !== action.index);
    case "UPDATE_DEFAULT_CHARACTER":
      return state.map((keyword, index) =>
        index === action.index ? action.payload : keyword
      );
    case "MOVE_DEFAULT_CHARACTER": {
      const { fromIndex, toIndex } = action;
      const newState = [...state];
      const [movedCharacter] = newState.splice(fromIndex, 1);
      newState.splice(toIndex, 0, movedCharacter);
      return newState;
    }
    default:
      return state;
  }
};

const [
  DefaultCharactersProvider,
  useDefaultCharactersStore,
  useDefaultCharactersDispatch,
] = makeStore(reducer, initialState);

export {
  DefaultCharactersProvider,
  useDefaultCharactersStore,
  useDefaultCharactersDispatch,
};
