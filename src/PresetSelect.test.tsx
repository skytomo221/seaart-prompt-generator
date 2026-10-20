// @vitest-environment jsdom
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { InputHTMLAttributes } from "react";
import { afterEach, expect, it, vi } from "vitest";
import PresetSelect from "./PresetSelect";

// Keep the query empty, as Blueprint can do after selecting an item.
vi.mock("@blueprintjs/select", () => ({
  Suggest: ({
    inputProps,
  }: {
    inputProps: InputHTMLAttributes<HTMLInputElement>;
  }) => <input {...inputProps} />,
}));

const options = [
  { id: "__blank", label: "空白" },
  {
    id: "black-skirt",
    label: "スカート（黒）",
    color: "red",
    backgroundColor: "black",
  },
];

afterEach(cleanup);

function copy(input: HTMLInputElement) {
  const setData = vi.fn();
  const event = createEvent.copy(input, { clipboardData: { setData } });
  fireEvent(input, event);
  return { setData, event };
}

it("copies the selected label with an empty query and preserves colors", () => {
  render(
    <PresetSelect
      presetId="black-skirt"
      options={options}
      onChange={vi.fn()}
    />,
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  expect(input.value).toBe("");
  expect(input.style.color).toBe("red");
  expect(input.style.backgroundColor).toBe("black");
  const { setData, event } = copy(input);
  expect(setData).toHaveBeenCalledExactlyOnceWith(
    "text/plain",
    "スカート（黒）",
  );
  expect(event.defaultPrevented).toBe(true);
});

it.each([
  [0, 3],
  [0, 5],
])("preserves native copy for query selection %i–%i", (start, end) => {
  render(
    <PresetSelect
      presetId="black-skirt"
      options={options}
      onChange={vi.fn()}
    />,
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "skirt" } });
  input.setSelectionRange(start, end);
  const { setData, event } = copy(input);
  expect(setData).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});

it("copies the label instead of an unselected search query", () => {
  render(
    <PresetSelect
      presetId="black-skirt"
      options={options}
      onChange={vi.fn()}
    />,
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "skirt" } });
  input.setSelectionRange(2, 2);
  const { setData, event } = copy(input);
  expect(setData).toHaveBeenCalledExactlyOnceWith(
    "text/plain",
    "スカート（黒）",
  );
  expect(event.defaultPrevented).toBe(true);
});

it.each([undefined, "__blank", "missing"])(
  "preserves native copy without a selected preset (%s)",
  (presetId) => {
    render(
      <PresetSelect presetId={presetId} options={options} onChange={vi.fn()} />,
    );
    const { setData, event } = copy(
      screen.getByRole("textbox") as HTMLInputElement,
    );
    expect(setData).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  },
);
