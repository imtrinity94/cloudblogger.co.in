# Edit Resource Element On-The-Go

![Edit text-based Resource Elements On-The-Go](https://cloudblogger.co.in/wp-content/uploads/2022/12/cloudblogger-banner-3357-resource-editor.png)

Edit a text-based resource element (`.yaml`, `.json`, `.xml`, `.sh`, `.ps1`, ...) right from an Orchestrator (vRO) workflow form, without exporting, editing in a text editor and importing it back. Every save lands in the resource element's version history, and you can set a new version from the form.

Companion to the cloudblogger.co.in post [Edit text-based Resource Elements On-The-Go](https://cloudblogger.co.in/2022/12/14/edit-text-based-resource-elements-on-the-go-cb10103/).

## What's inside

Package: `in.co.cloudblogger.editresourceelementonthego_v1.2.0_20261120.package`

### Workflow: `Edit Resource Element On-The-Go` (folder `CB`)

| Input | What it does |
| --- | --- |
| `RES_ELEM` | Resource element to edit |
| `MIME_TYPE` | Prefilled with the element's MIME type. For text files use `text/<extension>`, e.g. `text/yaml`, so the content shows in vRO |
| `VERSION` | Optional new version `x.y.z`. Leave empty to keep the current version |
| `CONTENT` | Prefilled with the current content on the second page; edit it and run |

### Module: `in.co.cloudblogger.resource`

| Action | Returns | What it does |
| --- | --- | --- |
| `commitResourceElementContent` | void | Saves the content through the vRO REST API so it lands in version history, optionally sets the version, keeps the description and MIME type. Falls back to the scripting API when it can't use REST (see below) |
| `getResourceElementContent` | string | Current content, used to prefill the form |
| `getResourceElementMimeType` | string | Current MIME type, used to prefill the form |

The `actions/` folder has every script as a plain `.js` file, and `workflows/` has the workflow schema, so you can read them without importing anything.

## How saving works

1. **Default vRA host found** (Orchestrator embedded in VCF Automation or Aria Automation): the action calls Orchestrator's own REST API through the vRA plug-in's Default host, which handles the login (as the user running the workflow) and the certificate. `POST /vco/api/resources/{id}` uploads the content and creates a version history commit; `PUT /vco/api/resources/{id}` then sets the version and puts the description and MIME type back.
2. **No default vRA host, or the REST call fails** (for example a standalone Orchestrator whose vRA host points to a different instance): it falls back to the scripting API, `setContentFromMimeAttachment`. The content is saved, but the save does not appear in version history and the version is not changed. The run log shows a warning saying so.

Why REST: a scripting API update changes the content but creates no version history entry, and `saveToVersionRepository()` is deprecated and no longer functional (Orchestrator logs exactly that on 9.1.1).

## Quick example

```javascript
// Inside any scriptable task
var res = Server.getResourceElementCategoryWithPath("LAB/Text").resourceElements[0];
System.getModule("in.co.cloudblogger.resource")
    .commitResourceElementContent(res, "flavor: small\n", "text/yaml", "1.0.1");
```

## Tested on

VCF Operations Orchestrator 9.1.1 (build 25643527) embedded in VCF Automation 9.1.1: REST path with and without a version bump, and both fallback paths (no default host, REST failure). Should also work on the Orchestrator embedded in Aria Automation 8.x.

## Notes

- `resourceElement.id` is undefined in scripting, so the action uses `System.getObjectId(resourceElement)`.
- The metadata `PUT` needs `category-id` and `mime-type` in the body, otherwise it fails with "The target folder does not exist".
- Orchestrator stores `text/yaml` as `application/x-yaml`; that's expected.
- Each REST save creates two commits: one for the content, one for the metadata.
- Disclaimer: provided as is, without warranty. Test in a lab before using in production.
