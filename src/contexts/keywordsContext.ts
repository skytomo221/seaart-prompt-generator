import { Keyword } from "../data";
import makeStore from "./makeStore";

type State = Keyword[];

type Action =
  | {
      type: "SET_KEYWORDS";
      payload: Keyword[];
    }
  | {
      type: "ADD_KEYWORD";
      index: number;
      payload: Keyword;
    }
  | {
      type: "REMOVE_KEYWORD";
      index: number;
    }
  | {
      type: "UPDATE_KEYWORD";
      index: number;
      payload: Keyword;
    }
  | {
      type: "MOVE_KEYWORD";
      fromIndex: number;
      toIndex: number;
    };

const initialState: State = [];

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "SET_KEYWORDS":
      return action.payload;
    case "ADD_KEYWORD":
      const newState = [...state];
      newState.splice(action.index, 0, action.payload);
      return newState;
    case "REMOVE_KEYWORD":
      return state.filter((_, index) => index !== action.index);
    case "UPDATE_KEYWORD":
      return state.map((keyword, index) =>
        index === action.index ? action.payload : keyword
      );
    case "MOVE_KEYWORD": {
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

const [KeywordsProvider, useKeywordsStore, useKeywordsDispatch] = makeStore(
  reducer,
  initialState
);

export { KeywordsProvider, useKeywordsStore, useKeywordsDispatch };
