/**
 * @action commitResourceElementContent (1.2.0)
 * @module in.co.cloudblogger.resource
 * @param {ResourceElement} resourceElement - Resource element to update
 * @param {string} content - New text content
 * @param {string} mimeType - Optional MIME type, e.g. text/yaml. Defaults to the element's current one
 * @param {string} version - Optional new version x.y.z. Defaults to the current version
 * @returns {void}
 * @description Saves the content through the vRO REST API (vRA plug-in Default host), so the
 *   change is committed to version history like a UI update, and optionally sets a new version.
 *   Keeps the element's description and MIME type. With no default vRA host, or if the REST
 *   call fails, it falls back to the scripting API with a warning: the content is saved, but
 *   the save does not appear in version history and the version is not changed.
 */
var logPrefix = "[CB][commitResourceElementContent] ";

if (!resourceElement) {
    throw logPrefix + "resourceElement is required";
}
if (content === null || content === undefined) {
    throw logPrefix + "content is required";
}
if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    throw logPrefix + "version must look like x.y.z, got: " + version;
}

// resourceElement.id is undefined in scripting; use the object id
var resourceId = String(System.getObjectId(resourceElement));
var basePath = "/vco/api/resources/" + resourceId;

// Fallback: scripting API. Saves the content, but creates no version history entry
// and cannot change the version.
function saveWithScripting(reason) {
    System.warn(logPrefix + reason + " Falling back to the scripting API: the content is saved, " +
        "but this save will not appear in the version history" +
        (version ? " and the version is not changed to " + version : "") + ".");
    var attachment = new MimeAttachment();
    attachment.name = resourceElement.name;
    attachment.mimeType = mimeType ? mimeType : (resourceElement.mimeType ? resourceElement.mimeType : "text/plain");
    attachment.content = content;
    resourceElement.setContentFromMimeAttachment(attachment);
    System.log(logPrefix + "Content saved for '" + resourceElement.name + "' (scripting API)");
}

// 1. Find the vRA plug-in Default host (handles auth and certificates)
var client = null;
try {
    var vraHost = VraHostManager.defaultHostData;
    if (vraHost) {
        client = vraHost.createRestClient();
    }
} catch (hostError) {
    System.debug(logPrefix + "vRA plug-in not usable: " + hostError);
}
if (!client) {
    saveWithScripting("No default vRA host found in the vRA plug-in.");
    return;
}

function executeOrThrow(request, step) {
    var response = client.execute(request);
    var statusCode = response.statusCode;
    if (statusCode < 200 || statusCode >= 300) {
        throw step + " failed, HTTP " + statusCode + ": " + response.contentAsString;
    }
    return response;
}

// 2. Read metadata and upload the new content through REST (creates a version history commit)
var metadata;
var effectiveMimeType;
try {
    var getRequest = client.createRequest("GET", basePath, null);
    getRequest.setHeader("Accept", "application/vnd.o11n.resource.metadata+json;charset=UTF-8");
    metadata = JSON.parse(executeOrThrow(getRequest, "Reading metadata").contentAsString);

    effectiveMimeType = mimeType ? mimeType : metadata["mime-type"];
    if (!effectiveMimeType) {
        effectiveMimeType = "text/plain";
    }

    var boundary = "vroResourceBoundary" + System.nextUUID().replace(/-/g, "");
    var crlf = "\r\n";
    var body = "--" + boundary + crlf +
        "Content-Disposition: form-data; name=\"file\"; filename=\"" + metadata.name + "\"" + crlf +
        "Content-Type: " + effectiveMimeType + crlf +
        crlf +
        content + crlf +
        "--" + boundary + "--" + crlf;

    var postRequest = client.createRequest("POST", basePath, body);
    postRequest.setHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    executeOrThrow(postRequest, "Uploading content");
} catch (restError) {
    saveWithScripting("REST save failed (" + restError + ").");
    return;
}
System.log(logPrefix + "Content committed for '" + metadata.name + "' (" + resourceId + ")");

// 3. Restore description and MIME type (the upload overwrites them) and set the version
var targetVersion = version ? version : metadata.version;
var newMetadata = {
    "id": resourceId,
    "name": metadata.name,
    "version": targetVersion,
    "description": metadata.description ? metadata.description : "",
    "category-id": metadata["category-id"],
    "mime-type": effectiveMimeType
};
try {
    var putRequest = client.createRequest("PUT", basePath, JSON.stringify(newMetadata));
    putRequest.setHeader("Content-Type", "application/json");
    executeOrThrow(putRequest, "Updating metadata");
    System.log(logPrefix + "Version " + metadata.version + " -> " + targetVersion + ", MIME type " + effectiveMimeType);
} catch (metadataError) {
    System.warn(logPrefix + "Content is committed, but the version, description and MIME type could not be updated (" + metadataError + ").");
}
