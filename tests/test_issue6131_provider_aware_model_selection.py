"""Regression coverage for provider-aware duplicate model selection (#6131)."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
UI_JS = ROOT / "static" / "ui.js"
NODE = shutil.which("node")


_DRIVER = r"""
const fs = require('fs');
const uiSrc = fs.readFileSync(process.argv[1], 'utf8');
const preferredProvider = process.argv[2] || '';

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('not found: ' + name);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unterminated: ' + name);
}

eval([
  '_getOptionProviderId',
  '_providerFromModelValue',
  '_modelStateForSelect',
  '_captureModelDropdownSelection',
  '_findModelInDropdown',
  '_applyModelToDropdown',
].map(name => extractFunction(uiSrc, name)).join('\n'));

globalThis._refreshOpenModelDropdown = () => {};
globalThis.syncSettingsModelChip = () => {};

const options = [
  {
    value: 'z-ai/glm-5.2',
    textContent: 'GLM-5.2 via Z.AI',
    dataset: {},
    parentElement: {tagName: 'OPTGROUP', dataset: {provider: 'zai'}},
  },
  {
    value: 'z-ai/glm-5.2',
    textContent: 'GLM-5.2 via NVIDIA',
    dataset: {},
    parentElement: {tagName: 'OPTGROUP', dataset: {provider: 'nvidia'}},
  },
];

let selectedIndex = 0;
for (const option of options) {
  Object.defineProperty(option, 'selected', {
    get() { return options[selectedIndex] === option; },
    set(value) { if (value) selectedIndex = options.indexOf(option); },
  });
}

const select = {
  id: 'settingsModel',
  options,
  get selectedIndex() { return selectedIndex; },
  set selectedIndex(value) { selectedIndex = Number(value); },
  get selectedOptions() {
    return selectedIndex >= 0 ? [options[selectedIndex]] : [];
  },
  get value() {
    return selectedIndex >= 0 ? options[selectedIndex].value : '';
  },
  set value(value) {
    selectedIndex = options.findIndex(option => option.value === value);
  },
};

const before = _modelStateForSelect(select, select.value);
const applied = _applyModelToDropdown('z-ai/glm-5.2', select, preferredProvider);
const after = _modelStateForSelect(select, select.value);
const captured = _captureModelDropdownSelection(select);

process.stdout.write(JSON.stringify({
  before,
  applied,
  after,
  captured,
  selectedIndex,
  selectedProvider: _getOptionProviderId(select.selectedOptions[0]),
  optionProviders: options.map(option => _getOptionProviderId(option)),
}));
"""


def _run_driver(preferred_provider: str) -> dict:
    proc = subprocess.run(
        [NODE, "-e", _DRIVER, str(UI_JS), preferred_provider],
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


@pytest.mark.skipif(NODE is None, reason="node not on PATH")
def test_apply_model_dropdown_preserves_preferred_provider_for_duplicate_value():
    result = _run_driver("nvidia")

    assert result["before"]["model_provider"] == "zai"
    assert result["applied"] == "z-ai/glm-5.2"
    assert result["selectedIndex"] == 1
    assert result["selectedProvider"] == "nvidia"
    assert result["after"] == {
        "model": "z-ai/glm-5.2",
        "model_provider": "nvidia",
    }
    assert result["captured"] == result["after"]


@pytest.mark.skipif(NODE is None, reason="node not on PATH")
def test_apply_model_dropdown_does_not_fabricate_missing_provider_option():
    result = _run_driver("anthropic")

    assert result["applied"] == "z-ai/glm-5.2"
    assert result["selectedIndex"] == 0
    assert result["selectedProvider"] == "zai"
    assert result["after"]["model_provider"] == "zai"
    assert result["captured"] == result["after"]
    assert result["optionProviders"] == ["zai", "nvidia"]
