const POINTER_EVENTS_WARNING = "props.pointerEvents is deprecated. Use style.pointerEvents";

if (!globalThis.__coysWarningFilterInstalled) {
  const originalWarn = console.warn;

  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0] === POINTER_EVENTS_WARNING) {
      return;
    }

    originalWarn(...args);
  };

  globalThis.__coysWarningFilterInstalled = true;
}
