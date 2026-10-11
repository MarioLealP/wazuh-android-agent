(function () {
  var root = document.documentElement;
  var nav = document.querySelector("[data-nav]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  var themeToggle = document.querySelector("[data-theme-toggle]");
  var barActions = document.querySelector(".bar-actions");
  var wideNav = window.matchMedia("(min-width: 860px)");
  var sessionTheme = readStoredTheme();
  if (sessionTheme !== "dark" && sessionTheme !== "light") {
    sessionTheme = null;
  }

  function readStoredTheme() {
    try {
      return localStorage.getItem("theme");
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      /* Private mode can block storage. sessionTheme still keeps this choice. */
    }
  }

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function chosenTheme() {
    return sessionTheme;
  }

  function currentTheme() {
    return chosenTheme() || systemTheme();
  }

  function paintTheme(theme) {
    if (!themeToggle) {
      return;
    }
    var next = theme === "dark" ? "light" : "dark";
    themeToggle.textContent = next === "dark" ? "Dark" : "Light";
    themeToggle.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  paintTheme(currentTheme());

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (chosenTheme()) {
      return;
    }
    root.removeAttribute("data-theme");
    paintTheme(systemTheme());
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = themeToggle.textContent.trim().toLowerCase() === "dark" ? "dark" : "light";
      sessionTheme = next;
      root.setAttribute("data-theme", next);
      storeTheme(next);
      paintTheme(next);
    });
  }

  function placeNav() {
    var bar = nav && nav.parentElement;
    if (!bar || !barActions) {
      return;
    }
    if (wideNav.matches) {
      bar.insertBefore(nav, barActions);
    } else {
      bar.appendChild(nav);
    }
  }

  if (nav && navToggle) {
    placeNav();
    wideNav.addEventListener("change", placeNav);

    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.textContent = open ? "Close" : "Menu";
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.textContent = "Menu";
        navToggle.focus();
      }
    });
  }

  var copyStatus = document.querySelector("[data-copy-status]");

  function announce(message) {
    if (!copyStatus) {
      return;
    }
    copyStatus.textContent = "";
    window.setTimeout(function () {
      copyStatus.textContent = message;
    }, 50);
  }

  function selectCode(code) {
    var range = document.createRange();
    range.selectNodeContents(code);
    var selection = window.getSelection();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var block = button.closest(".cmd");
      var code = block ? block.querySelector("code") : null;
      var text = code ? code.textContent : "";
      var original = button.getAttribute("data-label") || "Copy";

      function flash(label) {
        button.textContent = label;
        window.setTimeout(function () {
          button.textContent = original;
        }, 1600);
      }

      function showSelection() {
        if (code) {
          selectCode(code);
        }
        flash("Selected");
        announce("Command selected");
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          flash("Copied");
          announce("Copied");
        }).catch(showSelection);
      } else {
        showSelection();
      }
    });
  });
})();
