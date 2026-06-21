// Browser stub for bare-runtime packages.
// These packages use require.addon() which only exists in the Bare runtime.
// In the browser we return a no-op proxy so imports don't crash.
module.exports = new Proxy({}, {
  get() {
    return () => {};
  },
});
module.exports.addon = () => module.exports;
