function loadNodeContent(brainNote) {
  return Promise.resolve(brainNote.rawContent);
}

exports.loadNodeContent = loadNodeContent;
