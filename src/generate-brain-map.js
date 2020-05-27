var fs = require("fs");

module.exports = (
  { brainMapPath = "static/brainmap.json", brainBaseUrl = "" },
  slugToNoteNodeMap
) => {
  let path = brainMapPath;

  let pages = {};
  let externalReferences = [];
  for (let slug in slugToNoteNodeMap) {
    let node = slugToNoteNodeMap[slug];
    let validRepresentationsOfSlug = [slug];
    if (slug != node.title.toLowerCase()) {
      validRepresentationsOfSlug.push(node.title.toLowerCase());
    }
    validRepresentationsOfSlug = validRepresentationsOfSlug.concat(
      node.aliases
    );
    pages[slug] = validRepresentationsOfSlug;

    node.externalOutboundReferences.forEach((entry) =>
      externalReferences.push({
        targetSite: entry["targetSite"],
        targetPage: entry["targetPage"],
        sourcePage: slug,
        previewHtml: entry["previewHtml"],
      })
    );
  }

  let brainMap = {
    rootDomain: brainBaseUrl,
    pages: pages,
    externalReferences: externalReferences,
  };
  let data = JSON.stringify(brainMap);
  fs.writeFileSync(path, data);
};
