# Changelog

All changes to Edit Resource Element On-The-Go, newest first.

## 1.2.0 (2026-11-20)

- `commitResourceElementContent` 1.2.0: falls back to the scripting API (`setContentFromMimeAttachment`) when there is no default vRA host in the vRA plug-in, or when the REST save fails (for example a standalone Orchestrator whose vRA host points to a different instance). The content is still saved; a warning in the run log says the save won't appear in version history and the version is not changed.
- If the content is committed but the metadata update fails, the action now logs a warning instead of failing the workflow.
- Everything now lives in the `edit-resource-element-on-the-go/` folder: package `in.co.cloudblogger.editresourceelementonthego_v1.2.0_20261120.package`, README, this changelog, the action scripts in `actions/` and the workflow schema in `workflows/`.

## 1.1.0 (2026-11-18)

- Saves now go through the vRO REST API (via the vRA plug-in Default host), so every save creates a commit in the resource element's version history. The scripting API (`setContentFromMimeAttachment`) changes content without history, and `saveToVersionRepository()` is deprecated and no longer functional.
- New optional **New Version (x.y.z)** input to set the resource element's version on save.
- The element's description and MIME type are kept after a save (a REST content upload overwrites the description).
- Actions moved to module `in.co.cloudblogger.resource`: `commitResourceElementContent`, `getResourceElementContent`, `getResourceElementMimeType`.
- Workflow "Edit Resource Element On-The-Go" updated to 1.1.1.
- Tested on VCF Automation 9.1.1 embedded Orchestrator; should work on embedded Orchestrator in vRA / Aria Automation 8.x.

## 1.0.0 (2022-12-14)

- First release: edit a text-based resource element from a workflow form.
