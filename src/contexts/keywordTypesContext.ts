import { KeywordType } from "../data";
import makeStore from "./makeStore";

type State = KeywordType[];

type Action =
  | {
      type: "SET_KEYWORD_TYPES";
      payload: KeywordType[];
    }
  | {
      type: "ADD_KEYWORD_TYPE";
      index: number;
      payload: KeywordType;
    }
  | {
      type: "REMOVE_KEYWORD_TYPE";
      index: number;
    }
  | {
      type: "UPDATE_KEYWORD_TYPE";
      index: number;
      payload: KeywordType;
    }
  | {
      type: "MOVE_KEYWORD_TYPE";
      fromIndex: number;
      toIndex: number;
    };

const initialState: State = [];

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "SET_KEYWORD_TYPES":
      return action.payload;
    case "ADD_KEYWORD_TYPE":
      const newState = [...state];
      newState.splice(action.index, 0, action.payload);
      return newState;
    case "REMOVE_KEYWORD_TYPE":
      return state.filter((_, index) => index !== action.index);
    case "UPDATE_KEYWORD_TYPE":
      return state.map((keyword, index) =>
        index === action.index ? action.payload : keyword
      );
    case "MOVE_KEYWORD_TYPE": {
      const { fromIndex, toIndex } = action;
      const newState = [...state];
      const [movedKeyword] = newState.splice(fromIndex, 1);
      newState.splice(toIndex, 0, movedKeyword);
      return newState;
    }
    default:
      return state;
  }
};

const [KeywordTypesProvider, useKeywordTypesStore, useKeywordTypesDispatch] = makeStore(
  reducer,
  initialState
);

export { KeywordTypesProvider, useKeywordTypesStore, useKeywordTypesDispatch };
