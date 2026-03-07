// TalkingHead loader — creates import map and loads the module
// This must run as a classic script (not module) to set up the import map before any modules load

(function() {
  // Only inject once
  if (window.__talkingHeadLoading) return;
  window.__talkingHeadLoading = true;

  // The import map should already be in the HTML <head>
  // We just need to load TalkingHead as a module after the map is ready
  
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import { TalkingHead } from "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs";
    window.TalkingHead = TalkingHead;
    window.dispatchEvent(new Event('talkinghead-ready'));
  `;
  document.head.appendChild(script);
})();
