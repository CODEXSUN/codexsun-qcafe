# MDI side car

`mdi.sideCar` is the shared companion container beside the active app workspace.
`mdi.sideCarRail` and the top menu button collapse or expand it.

The shell supplies no search, page list, or product controls. An add-on can
provide `renderSideCar(): ReactNode` through `MdiWorkspaceAddon`. The shell
owns placement, scrolling, theme, and visibility. The app owns the content.
Existing apps can use the third `renderPage` argument as a portal target.

Zetro exposes one agent workspace and supplies no side car content. Its crew
runtimes remain available through orchestration without separate agent pages.
