import makeStore from "./makeStore";
import { PromptGenerator } from "../promptGenerator";

type State = PromptGenerator[];

type Action =
  | {
      type: "SET_PROMPT_GENERATORS";
      payload: PromptGenerator[];
    }
  | {
      type: "ADD_PROMPT_GENERATOR";
      index: number;
      payload: PromptGenerator;
    }
  | {
      type: "REMOVE_PROMPT_GENERATOR";
      index: number;
    }
  | {
      type: "UPDATE_PROMPT_GENERATOR";
      index: number;
      payload: PromptGenerator;
    }
  | {
      type: "MOVE_PROMPT_GENERATOR";
      fromIndex: number;
      toIndex: number;
    };

const initialState: State = [
  {
    id: "initial-prompt-generator",
    selectedKeywordNames: Array(8).fill({ name: "空白" }).map((v) => ({ id: crypto.randomUUID(), ...v }))
  }
];

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "SET_PROMPT_GENERATORS":
      return action.payload;
    case "ADD_PROMPT_GENERATOR":
      const newState = [...state];
      newState.splice(action.index, 0, action.payload);
      return newState;
    case "REMOVE_PROMPT_GENERATOR":
      return state.filter((_, index) => index !== action.index);
    case "UPDATE_PROMPT_GENERATOR":
      return state.map((keyword, index) =>
        index === action.index ? action.payload : keyword
      );
    case "MOVE_PROMPT_GENERATOR": {
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
  PromptGeneratorsProvider,
  usePromptGeneratorsStore,
  usePromptGeneratorsDispatch,
] = makeStore(reducer, initialState);

export {
  PromptGeneratorsProvider,
  usePromptGeneratorsStore,
  usePromptGeneratorsDispatch,
};
