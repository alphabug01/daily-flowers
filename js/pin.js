// The florist pages sit behind a PIN. Only a hash of the PIN is kept here, and
// an unlock lasts until the tab is closed.
//
// This only keeps casual visitors out: the site is static, so anyone who reads
// its source can get past it. Keep anything truly private off these pages.

import { hashString } from "./random.js";

const PIN_HASH = 0x7e961fb9; // hashString("daily-flowers|" + pin)
const KEY = "florist-unlocked";

const matches = (pin) => hashString(`daily-flowers|${pin}`) === PIN_HASH;

function remembered() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // no storage (private window): it just asks again on the next page
  }
}

// Resolves once the PIN has been entered; until then only the PIN form shows.
export function unlock() {
  if (remembered()) {
    document.body.classList.remove("locked");
    return Promise.resolve();
  }
  const gate = document.createElement("form");
  gate.className = "gate card";
  gate.innerHTML = `
    <a class="back" href="./">← today's bouquet</a>
    <h1>Florist</h1>
    <label for="pin">Enter the PIN to open the florist pages.</label>
    <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" required />
    <p class="gate-error" id="pin-error" role="alert"></p>
    <button type="submit">open</button>`;
  document.body.append(gate);
  const input = gate.querySelector("input");
  const error = gate.querySelector("#pin-error");
  input.focus();

  return new Promise((resolve) => {
    gate.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!matches(input.value.trim())) {
        error.textContent = "That's not the PIN.";
        input.value = "";
        input.focus();
        gate.classList.remove("shake");
        void gate.offsetWidth;
        gate.classList.add("shake");
        return;
      }
      remember();
      gate.remove();
      document.body.classList.remove("locked");
      resolve();
    });
  });
}
