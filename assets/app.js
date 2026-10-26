// Builds the home page, the lesson header/footer, and saves progress in this browser.
(function () {
  var KEY = "sd-progress-v1";
  var THEME_KEY = "sd-theme";
  var C = window.COURSE;
  var isLesson = !!document.body.dataset.lesson;
  var base = isLesson ? "" : "lessons/";
  var home = isLesson ? "../index.html" : "index.html";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage blocked: progress just won't stick */ }
  }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  var all = [];
  C.modules.forEach(function (m, mi) {
    m.lessons.forEach(function (l, li) {
      all.push({ id: l.id, title: l.title, ready: !!l.ready, module: m, mi: mi, li: li });
    });
  });
  function href(l) { return base + l.id + ".html"; }

  // ---- theme toggle (Auto / Light / Dark) ----
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  var theme = "auto";
  try { theme = localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { /* ignore */ }
  applyTheme(theme);

  function topbar(where) {
    var bar = el("div", { class: "topbar" });
    var w = el("div", { class: "wrap" });
    w.appendChild(el("a", { href: home }, isLesson ? "← All lessons" : "System Design from Zero"));
    if (where) w.appendChild(el("span", { class: "where" }, where));
    var labels = { auto: "Theme: Auto", light: "Theme: Light", dark: "Theme: Dark" };
    var b = el("button", { class: "theme-btn", type: "button", title: "Change colours" }, labels[theme]);
    b.onclick = function () {
      theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
      applyTheme(theme);
      b.textContent = labels[theme];
    };
    w.appendChild(b);
    bar.appendChild(w);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ---- copy buttons on every code block ----
  function addCopyButtons() {
    document.querySelectorAll("pre").forEach(function (pre) {
      var btn = el("button", { class: "copy-btn", type: "button" }, "Copy");
      btn.onclick = function () {
        var text = pre.querySelector("code") ? pre.querySelector("code").innerText : pre.innerText;
        var done = function () { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = "Copy"; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { btn.textContent = "Select and press Ctrl+C"; });
        else btn.textContent = "Select and press Ctrl+C";
      };
      pre.appendChild(btn);
    });
  }

  // ---- lesson page ----
  function lessonPage() {
    var id = document.body.dataset.lesson;
    var idx = all.findIndex(function (l) { return l.id === id; });
    var L = all[idx];
    if (!L) return;
    var m = L.module;
    document.title = L.title + " · System Design from Zero";
    topbar("Module " + L.mi + " · " + m.title);

    var main = document.querySelector("main");
    main.classList.add("wrap");
    var head = el("div");
    head.appendChild(el("h1", null, L.title));
    head.appendChild(el("p", { class: "lesson-meta" },
      "Module " + L.mi + ", lesson " + (L.li + 1) + " of " + m.lessons.length + " · about 2 hours"));
    main.insertBefore(head, main.firstChild);

    var box = el("div", { class: "done-box" });
    var msg = el("p", { style: "margin:0 0 10px" });
    var btn = el("button", { class: "btn", type: "button" });
    function paint() {
      var done = !!load()[id];
      box.classList.toggle("is-done", done);
      btn.textContent = done ? "✓ Done! (click to undo)" : "Mark this lesson as done";
      msg.textContent = done ? "Great work. This tick is saved in this browser." : "Finished everything above? Click the button.";
    }
    btn.onclick = function () {
      var p = load();
      if (p[id]) delete p[id]; else p[id] = new Date().toISOString().slice(0, 10);
      save(p);
      paint();
    };
    box.appendChild(msg);
    box.appendChild(btn);
    paint();
    main.appendChild(box);

    var pager = el("nav", { class: "pager" });
    function link(l, cls, label) {
      if (!l) return el("span", { class: cls }, "<small>" + label + "</small>—");
      if (!l.ready) return el("span", { class: cls }, "<small>" + label + " (coming soon)</small>" + l.title);
      return el("a", { class: cls, href: href(l) }, "<small>" + label + "</small>" + l.title);
    }
    pager.appendChild(link(all[idx - 1], "prev", "← Previous"));
    pager.appendChild(link(all[idx + 1], "next", "Next →"));
    main.appendChild(pager);
    addCopyButtons();
  }

  // ---- home page ----
  function homePage() {
    topbar(null);
    var p = load();
    var readyCount = all.filter(function (l) { return l.ready; }).length;
    var doneCount = all.filter(function (l) { return p[l.id]; }).length;

    var pct = Math.round((doneCount / all.length) * 100);
    document.getElementById("overall-bar").style.width = pct + "%";
    document.getElementById("overall-text").textContent =
      doneCount + " of " + all.length + " lessons done (" + pct + "%). " +
      readyCount + " lessons are written so far; the rest are coming soon.";

    var next = all.find(function (l) { return l.ready && !p[l.id]; });
    var start = document.getElementById("start-btn");
    if (next) {
      start.href = href(next);
      start.textContent = doneCount ? "Continue: " + next.title + " →" : "Start here: " + next.title + " →";
    } else {
      start.style.display = "none";
    }

    var box = document.getElementById("modules");
    C.modules.forEach(function (m, mi) {
      var sec = el("section", { class: "module", id: m.id });
      var d = m.lessons.filter(function (l) { return p[l.id]; }).length;
      sec.appendChild(el("header", null,
        "<h2>Module " + mi + ": " + m.title + "</h2><span class='when'>" + m.when + " · " + d + "/" + m.lessons.length + " done</span>"));
      sec.appendChild(el("p", { class: "about" }, m.about));
      var bar = el("div", { class: "bar" }, "<i style='width:" + Math.round((d / m.lessons.length) * 100) + "%'></i>");
      sec.appendChild(bar);
      var ul = el("ul", { class: "lessons" });
      m.lessons.forEach(function (l, li) {
        var item = el("li", p[l.id] ? { class: "done" } : null);
        item.appendChild(el("span", { class: "tick" }, p[l.id] ? "✓" : ""));
        item.appendChild(el("span", { class: "num" }, mi + "." + (li + 1)));
        if (l.ready) item.appendChild(el("a", { href: "lessons/" + l.id + ".html" }, l.title));
        else item.appendChild(el("span", { class: "soon" }, l.title + "<small>coming soon</small>"));
        ul.appendChild(item);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });

    // backup / restore
    var out = document.getElementById("tools-msg");
    document.getElementById("export-btn").onclick = function () {
      var blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "system-design-progress.json" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      out.textContent = "Saved as system-design-progress.json in your Downloads folder.";
    };
    var file = document.getElementById("import-file");
    document.getElementById("import-btn").onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files[0];
      if (!f) return;
      f.text().then(function (t) {
        try {
          var data = JSON.parse(t);
          var merged = load();
          Object.keys(data).forEach(function (k) { merged[k] = data[k]; });
          save(merged);
          out.textContent = "Progress loaded. Refreshing…";
          setTimeout(function () { location.reload(); }, 700);
        } catch (e) {
          out.textContent = "That file is not a progress file. Pick system-design-progress.json.";
        }
      });
    };
    document.getElementById("reset-btn").onclick = function () {
      if (confirm("Remove ALL ticks in this browser? This cannot be undone (unless you downloaded a backup).")) {
        save({});
        location.reload();
      }
    };
  }

  if (isLesson) lessonPage(); else homePage();
})();
