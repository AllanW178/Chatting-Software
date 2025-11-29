\
    import React, { useEffect, useState, useRef } from "react";
    import { motion, AnimatePresence } from "framer-motion";
    import { Sun, Moon, Code, User, Lock, BookOpen, LogIn } from "lucide-react";

    // Utilities
    function bytesToHex(buffer) {
      return Array.prototype.map
        .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
        .join("");
    }
    async function sha256(text) {
      const enc = new TextEncoder();
      const data = enc.encode(text);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return bytesToHex(hash);
    }
    const STORAGE_KEYS = {
      USERS: "hyperlearn_users_v1",
      SESSION: "hyperlearn_session_v1",
      PROGRESS: "hyperlearn_progress_v1",
      TUTORIALS: "hyperlearn_tutorials_v1",
    };
    function readJSON(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function writeJSON(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    const SAMPLE_TUTORIALS = [
      {
        id: "js-hello",
        title: "JavaScript — Hello World & Console",
        tags: ["javascript", "beginner"],
        duration: "5m",
        difficulty: "Beginner",
        content: `Learn how console.log works. Write a function that returns "Hello, HyperLearn!" and call it.`,
        starter: `<!doctype html>\n<html>\n<body>\n  <div id=app></div>\n  <script>\n    function sayHello(){\n      // TODO: return a greeting string\n    }\n    const el = document.getElementById('app');\n    el.innerText = sayHello();\n  </script>\n</body>\n</html>`,
        answerHint: "Return the string 'Hello, HyperLearn!' from sayHello()",
      },
      {
        id: "css-card",
        title: "CSS — Building a Glassmorphism Card",
        tags: ["css", "design"],
        duration: "10m",
        difficulty: "Beginner",
        content: "Create a floating glass card with backdrop-filter and transitions.",
        starter: `<!doctype html>\n<html>\n<head>\n  <style>\n    body{display:grid;place-items:center;height:100vh;background:linear-gradient(135deg,#0f172a,#060b12);} \n    .card{width:320px;padding:24px;border-radius:16px;background:rgba(255,255,255,0.06);backdrop-filter: blur(6px);box-shadow:0 8px 30px rgba(2,6,23,0.7);} \n  </style>\n</head>\n<body>\n  <div class=\"card\">Hello — customize me</div>\n</body>\n</html>`,
        answerHint: "Use backdrop-filter: blur() and a translucent background color",
      },
      {
        id: "react-counter",
        title: "React — Tiny Counter (hooks)",
        tags: ["react", "beginner"],
        duration: "7m",
        difficulty: "Beginner",
        content: "Build a counter using useState and make it persist to localStorage.",
        starter: `<!doctype html>\n<html>\n<body>\n  <div id=app></div>\n  <script>\n    // This runner doesn't include React by default in the iframe, but you can\n    // emulate a simple counter with vanilla JS for the exercise.\n  </script>\n</body>\n</html>`,
        answerHint: "Use useState and effect to sync to localStorage (or simple DOM + localStorage)",
      },
    ];

    async function createUser(email, password, displayName) {
      const users = readJSON(STORAGE_KEYS.USERS, {});
      if (users[email]) throw new Error("User already exists");
      const passHash = await sha256(password);
      users[email] = { email, passHash, displayName, createdAt: Date.now() };
      writeJSON(STORAGE_KEYS.USERS, users);
      return users[email];
    }
    async function signIn(email, password) {
      const users = readJSON(STORAGE_KEYS.USERS, {});
      const u = users[email];
      if (!u) throw new Error("No user with that email");
      const passHash = await sha256(password);
      if (passHash !== u.passHash) throw new Error("Incorrect password");
      const session = { email, token: await sha256(email + Date.now().toString()) };
      writeJSON(STORAGE_KEYS.SESSION, session);
      return { user: u, session };
    }
    function signOut() {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
    function getSession() {
      return readJSON(STORAGE_KEYS.SESSION, null);
    }
    function getUser(email) {
      const users = readJSON(STORAGE_KEYS.USERS, {});
      return users[email] || null;
    }

    function Runner({ code, keyOverride }) {
      const iframeRef = useRef(null);
      const [logs, setLogs] = useState([]);
      useEffect(() => {
        setLogs([]);
        const iframe = iframeRef.current;
        if (!iframe) return;
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(code);
        doc.close();
        try {
          const iframeConsole = iframe.contentWindow.console;
          const originalLog = iframeConsole.log;
          iframeConsole.log = function (...args) {
            window.dispatchEvent(new CustomEvent("hyperlearn_iframe_log", { detail: { args } }));
            originalLog.apply(this, args);
          };
        } catch (e) {}
        function onLog(e) {
          const { args } = e.detail;
          setLogs((s) => [...s, args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")]);
        }
        window.addEventListener("hyperlearn_iframe_log", onLog);
        return () => window.removeEventListener("hyperlearn_iframe_log", onLog);
      }, [code, keyOverride]);

      return (
        <div className="w-full flex flex-col gap-2">
          <iframe
            key={keyOverride}
            ref={iframeRef}
            title="runner"
            sandbox="allow-scripts"
            className="w-full h-64 rounded-lg border border-zinc-800 bg-white"
          />
          <div className="bg-zinc-900 p-2 rounded text-sm h-28 overflow-auto text-white">{logs.length === 0 ? <em className="text-zinc-500">Console output will appear here (console.log)</em> : logs.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      );
    }

    function Editor({ code, onChange }) {
      const [value, setValue] = useState(code);
      useEffect(() => setValue(code), [code]);
      return (
        <div className="bg-zinc-950 rounded-lg overflow-hidden">
          <div className="flex gap-2 p-2 items-center border-b border-zinc-800">
            <Code size={16} />
            <div className="text-sm opacity-80">Live Editor</div>
          </div>
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full h-64 p-4 bg-transparent outline-none text-xs font-mono text-white resize-none"
          />
        </div>
      );
    }

    function Header({ dark, setDark, user, onSignOut }) {
      return (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-pink-500 shadow-lg text-white font-bold">H</div>
            <div>
              <div className="text-xl font-semibold">HyperLearn</div>
              <div className="text-xs opacity-70">Interactive coding academy</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-md" onClick={() => setDark((d) => !d)} title="Toggle theme">
              {dark ? <Sun /> : <Moon />}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm opacity-80">Hello, {user.displayName || user.email}</div>
                <button className="px-3 py-1 rounded-md bg-zinc-800 text-white" onClick={onSignOut}>Sign out</button>
              </div>
            ) : (
              <div className="text-sm opacity-80">Not signed in</div>
            )}
          </div>
        </div>
      );
    }

    function Auth({ onSignedIn }) {
      const [phase, setPhase] = useState("welcome"); // welcome | signup | login
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-lg bg-gradient-to-br from-zinc-900 to-black shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Welcome to HyperLearn</h2>
            <p className="opacity-80 mb-4">Immersive tutorials, live runner, and a working sign-up / login — everything stored locally in your browser for privacy.</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded bg-indigo-600" onClick={() => setPhase('signup')}>Create account</button>
              <button className="px-4 py-2 rounded border border-zinc-700" onClick={() => setPhase('login')}>Sign in</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-lg bg-zinc-900">
            <AnimatePresence mode="wait">
              {phase === "signup" ? <SignUp onSignedIn={onSignedIn} key="signup" /> : phase === "login" ? <SignIn onSignedIn={onSignedIn} key="login" /> : (
                <div className="p-4 text-sm opacity-80">Choose <strong>Create account</strong> to register (email + password), or <strong>Sign in</strong> if you already registered. Passwords are hashed locally.</div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      );
    }

    function SignUp({ onSignedIn }) {
      const [email, setEmail] = useState("");
      const [name, setName] = useState("");
      const [password, setPassword] = useState("");
      const [err, setErr] = useState(null);
      const [loading, setLoading] = useState(false);
      async function submit(e) {
        e?.preventDefault();
        setErr(null);
        if (!email || !password) return setErr("Email and password required");
        setLoading(true);
        try {
          await createUser(email, password, name || email);
          const r = await signIn(email, password);
          onSignedIn(r.session);
        } catch (e) {
          setErr(e.message);
        } finally {
          setLoading(false);
        }
      }
      return (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2"><User /><div className="text-sm opacity-80">Create your account</div></div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (optional)" className="p-2 rounded bg-zinc-800" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="p-2 rounded bg-zinc-800" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="p-2 rounded bg-zinc-800" />
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-indigo-600" disabled={loading} onClick={submit}>{loading ? "Creating…" : "Create account"}</button>
            <button type="button" className="px-4 py-2 rounded border border-zinc-700" onClick={() => { setEmail(''); setPassword(''); setName(''); }}>Reset</button>
          </div>
        </motion.form>
      );
    }

    function SignIn({ onSignedIn }) {
      const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
      const [err, setErr] = useState(null);
      const [loading, setLoading] = useState(false);
      async function submit(e) {
        e?.preventDefault();
        setErr(null);
        setLoading(true);
        try {
          const r = await signIn(email, password);
          onSignedIn(r.session);
        } catch (e) {
          setErr(e.message);
        } finally {
          setLoading(false);
        }
      }
      return (
        <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2"><LogIn /><div className="text-sm opacity-80">Sign in</div></div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="p-2 rounded bg-zinc-800" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="p-2 rounded bg-zinc-800" />
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-indigo-600" disabled={loading} onClick={submit}>{loading ? "Signing in…" : "Sign in"}</button>
            <button type="button" className="px-4 py-2 rounded border border-zinc-700" onClick={() => { setEmail(''); setPassword(''); }}>Reset</button>
          </div>
        </motion.form>
      );
    }

    function LearningApp({ user }) {
      const [tutorials, setTutorials] = useState(() => readJSON(STORAGE_KEYS.TUTORIALS, SAMPLE_TUTORIALS));
      const [query, setQuery] = useState("");
      const [selected, setSelected] = useState(tutorials[0]);
      const [code, setCode] = useState(selected?.starter || "");
      const [runKey, setRunKey] = useState(Date.now());
      useEffect(() => {
        writeJSON(STORAGE_KEYS.TUTORIALS, tutorials);
      }, [tutorials]);
      useEffect(() => {
        setCode(selected?.starter || "");
        setRunKey(Date.now());
      }, [selected]);

      const filtered = tutorials.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.tags.join(' ').includes(query.toLowerCase()));

      function saveProgress(tid, progress) {
        const p = readJSON(STORAGE_KEYS.PROGRESS, {});
        p[tid] = { ...(p[tid] || {}), ...progress };
        writeJSON(STORAGE_KEYS.PROGRESS, p);
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="p-4 rounded-lg bg-zinc-900 sticky top-6">
              <div className="flex items-center gap-2 mb-3"><BookOpen /><div className="font-semibold">Tutorials</div></div>
              <input className="w-full p-2 rounded bg-zinc-800 mb-3" placeholder="Search tutorials (js, css, react...)" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {filtered.map(t => (
                  <button key={t.id} onClick={() => setSelected(t)} className={"w-full text-left p-3 rounded " + (selected?.id === t.id ? "bg-indigo-600/20" : "bg-zinc-800")}>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs opacity-70">{t.duration} • {t.difficulty}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-lg bg-zinc-900">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-lg font-semibold">{selected?.title}</div>
                  <div className="text-sm opacity-70">{selected?.content}</div>
                </div>
                <div className="text-xs opacity-60">{selected?.difficulty} • {selected?.duration}</div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Editor code={code} onChange={setCode} />
                  <div className="flex gap-2 mt-2">
                    <button className="px-4 py-2 rounded bg-green-600" onClick={() => setRunKey(Date.now())}>Run ▶</button>
                    <button className="px-4 py-2 rounded border" onClick={() => { setCode(selected.starter || ""); setRunKey(Date.now()); }}>Reset</button>
                    <button className="px-4 py-2 rounded border" onClick={() => { navigator.clipboard?.writeText(code); }}>Copy</button>
                  </div>
                </div>
                <Runner code={code} keyOverride={runKey} />
              </div>
              <div className="mt-3 text-sm opacity-70">Hint: {selected?.answerHint}</div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900">
              <div className="text-sm font-semibold mb-2">Notes & Progress</div>
              <textarea className="w-full p-2 rounded bg-zinc-800 h-28" placeholder="Write notes about the tutorial..." onBlur={(e) => saveProgress(selected.id, { notes: e.target.value })} />
            </div>
          </div>
        </div>
      );
    }

    export default function App() {
      useEffect(() => {
        const existing = readJSON(STORAGE_KEYS.TUTORIALS, null);
        if (!existing) writeJSON(STORAGE_KEYS.TUTORIALS, SAMPLE_TUTORIALS);
      }, []);

      const [mode, setMode] = useState(() => (getSession() ? "app" : "auth"));
      const [session, setSession] = useState(() => getSession());
      const [user, setUser] = useState(() => (getSession() ? getUser(getSession().email) : null));
      const [dark, setDark] = useState(true);

      function onSignedIn(sess) {
        setSession(sess);
        setUser(getUser(sess.email));
        setMode("app");
      }
      function handleSignOut() {
        signOut();
        setSession(null);
        setUser(null);
        setMode("auth");
      }

      return (
        <div className={"min-h-screen p-6 " + (dark ? "bg-gradient-to-br from-zinc-900 to-black text-white" : "bg-white text-black")}>
          <div className="max-w-6xl mx-auto">
            <Header dark={dark} setDark={setDark} user={user} onSignOut={handleSignOut} />
            <AnimatePresence mode="wait">
              {mode === "auth" ? (
                <motion.div key="auth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Auth onSignedIn={onSignedIn} />
                </motion.div>
              ) : (
                <motion.div key="app" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <LearningApp user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }
