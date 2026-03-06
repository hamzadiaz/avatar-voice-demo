# Avatar model assets

This project uses two local VRM assets:

- `public/avatars/male.vrm` → sourced from `madjin/vrm-samples` (`vroid/masc_vroid.vrm`)
- `public/avatars/female.vrm` → sourced from `madjin/vrm-samples` (`vroid/fem_vroid.vrm`)

Repository source: https://github.com/madjin/vrm-samples

## Licensing

The upstream repo documents that included VRoid sample models are available under VRoid sample terms / CC0 for specific models. Always verify current terms before commercial distribution:

- https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use-

## Replacing with your own avatars

1. Export/download two `.vrm` files.
2. Replace:
   - `public/avatars/male.vrm`
   - `public/avatars/female.vrm`
3. Keep the same filenames, or update paths in `src/components/live-conversation-panel.tsx`.
4. If expression names differ (some VRM models do), adjust mappings in `src/components/avatar/vrm-avatar-canvas.tsx`.
