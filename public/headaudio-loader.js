// HeadAudio loader - loads the HeadAudio module for audio-driven lip-sync
(function() {
  if (window.__headAudioLoading) return;
  window.__headAudioLoading = true;

  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import { HeadAudioNode } from "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@main/modules/headaudio.mjs";
    window.HeadAudioNode = HeadAudioNode;
    window.__headAudioWorkletUrl = "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@main/modules/headworklet.mjs";
    window.__headAudioModelUrl = "https://cdn.jsdelivr.net/gh/met4citizen/HeadAudio@main/dist/model-en-mixed.bin";
    window.dispatchEvent(new Event('headaudio-ready'));
  `;
  document.head.appendChild(script);
})();
