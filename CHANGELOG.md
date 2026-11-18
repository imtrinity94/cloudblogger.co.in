# Changelog

Changes to the vRO packages in this repository, newest first.

## in.co.cloudblogger.editresourceelementonthego 1.1.0 (2026-11-18)

Blog post: [Edit text-based Resource Elements On-The-Go](https://cloudblogger.co.in/2022/12/14/edit-text-based-resource-elements-on-the-go-cb10103/)

- Saves now go through the vRO REST API (via the vRA plug-in Default host), so every save creates a commit in the resource element's version history. The scripting API (`setContentFromMimeAttachment`) changes content without history, and `saveToVersionRepository()` is deprecated and no longer functional.
- New optional **New Version (x.y.z)** input to set the resource element's version on save.
- The element's description and MIME type are kept after a save (a REST content upload overwrites the description).
- Actions moved to module `in.co.cloudblogger.resource`: `commitResourceElementContent`, `getResourceElementContent`, `getResourceElementMimeType`.
- Workflow "Edit Resource Element On-The-Go" updated to 1.1.1.
- Tested on VCF Automation 9.1.1 embedded Orchestrator; should work on embedded Orchestrator in vRA / Aria Automation 8.x.

## in.co.cloudblogger.editresourceelementonthego 1.0.0 (2022-12-14)

- First release: edit a text-based resource element from a workflow form.
