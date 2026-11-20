/**
 * @action getResourceElementContent (1.0.0)
 * @module in.co.cloudblogger.resource
 * @param {ResourceElement} resourceElement - Resource element to read
 * @returns {string}
 * @description Returns the text content of a resource element (used to prefill the edit form).
 *   Empty string when nothing is selected.
 */
if (!resourceElement) {
    return "";
}
var mime = resourceElement.getContentAsMimeAttachment();
return mime && mime.content ? mime.content : "";
