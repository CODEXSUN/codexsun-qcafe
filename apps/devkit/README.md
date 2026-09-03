# DevKit

DevKit is the developer workspace application at `apps/devkit/web`.

It owns developer-focused tools, views, and user-experience features.

DevKit does not own control-plane state or execution-provider behavior. It uses public contracts when those integrations are added.

DevKit owns the reusable `@codexsun/devkit-ito` add-on. Applications bind the add-on through its public package API.
