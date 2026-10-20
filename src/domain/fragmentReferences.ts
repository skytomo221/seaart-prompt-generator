import type { FragmentReference, PromptFragment } from "../data";

export function isFragmentReference(
  value: unknown,
): value is FragmentReference {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    "fragmentId" in value &&
    typeof value.fragmentId === "string"
  );
}

// Also tolerates malformed imported data while validation reports its shape.
export function fragmentReferences(
  fragment: PromptFragment,
): FragmentReference[] {
  if (isFragmentReference(fragment)) return [fragment];
  if (
    fragment &&
    typeof fragment === "object" &&
    "parts" in fragment &&
    Array.isArray(fragment.parts)
  )
    return fragment.parts.filter(isFragmentReference);
  return [];
}
