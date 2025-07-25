// @ts-nocheck

function addKeyword() {
  const container = document.getElementById("keywords");
  const select = document.createElement("select");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "空白";
  placeholder.disabled = false;
  placeholder.selected = true;
  select.appendChild(placeholder);
  for (const keyword of data.keywords) {
    const option = document.createElement("option");
    option.value = keyword.name;
    option.textContent = keyword.name;
    select.appendChild(option);
  }
  container.appendChild(select);
}

function outputPrompts() {
  const container = document.getElementById("keywords");
  const selects = Array.from(container.querySelectorAll("select"));

  const selecteds = [];

  // 1回目: ユーザーが選択したキーワードを収集
  for (const select of selects) {
    const value = select.value;
    if (!value) continue;

    const keyword = data.keywords.find((k) => k.name === value);
    if (!keyword) continue;

    selecteds.push(keyword);
  }

  // 2回目: 各キャラに対してデフォルト補完を行う
  for (const s of selecteds) {
    if (s.type !== "キャラ") continue;

    const def = data.defaults.find((d) => d.character === s.name);
    if (!def || !def.parts) continue;

    for (const part of def.parts) {
      const alreadySelected = selecteds.some(
        (sel) =>
          sel.type === part.type &&
          data.keywords.find((k) => k.name === sel.name && k.type === part.type)
      );

      if (!alreadySelected) {
        selecteds.push(part);
      }
    }
  }

  // 出力
  const prompts = selecteds.map((s) => s.prompt).join(" ");
  console.log("selecteds:", selecteds);
  const negativePrompts = selecteds
    .map((s) => s.negativePrompt)
    .filter((np) => np && np.trim() !== "")
    .join(" ");
  document.getElementById("prompt-output").textContent = prompts;
  document.getElementById("negative-prompt-output").textContent =
    negativePrompts;
}

document.getElementById("add-keyword").addEventListener("click", addKeyword);

document.getElementById("keywords").addEventListener("change", outputPrompts);
