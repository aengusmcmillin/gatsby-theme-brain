var fs = require("fs");

module.exports = (pluginOptions, slugToNoteNodeMap) => {
  let path = pluginOptions.brainMapPath;

  let pages = {};
  let externalReferences = [];
  for (let slug in slugToNoteNodeMap) {
    let node = slugToNoteNodeMap[slug];
    console.log(node.aliases);
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
    rootDomain: pluginOptions.brainMapUrl,
    pages: pages,
    externalReferences: externalReferences,
  };
  //   "pages": {
  //     "foo": ["foo"],
  //     "books": ["books"]
  //   },
  //   "externalReferences": [
  //     {
  //       "targetSite": "http://127.0.0.1:8001/brain/",
  //       "targetPage": "inbound",
  //       "sourcePage": "books",
  //       "previewHtml": "<h1>I want to read this [[aengus2/inbound]]</h1>"
  //     }
  //   ]
  let data = JSON.stringify(brainMap);
  console.log(data);
  fs.writeFileSync(path, data);
};
