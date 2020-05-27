import React from "react";
import MDXRenderer from "gatsby-plugin-mdx/mdx-renderer";

const BrainNote = ({ note }) => {
  let references = [];
  let referenceBlock;
  if (note.inboundReferencePreviews != null) {
    references = note.inboundReferencePreviews.map((ref) => (
      <li>
        <a href={ref.source}>{ref.source}</a>
        <br />
        <div dangerouslySetInnerHTML={{ __html: ref.previewHtml }} />
      </li>
    ));

    if (references.length > 0) {
      referenceBlock = (
        <>
          <h2>Linked References</h2>
          <ul>{references}</ul>
        </>
      );
    }
  }

  let externalRefBlock = [];
  if (note.externalInboundReferences !== null) {
    let refs = note.externalInboundReferences.map((ref) => (
      <li>
        <a href={ref.sourceUrl}>
          {ref.siteName}/{ref.sourcePage}
        </a>
        <br />
        <div dangerouslySetInnerHTML={{ __html: ref.previewHtml }} />
      </li>
    ));
    if (refs.length > 0) {
      externalRefBlock = (
        <>
          <h2>External References</h2>
          <ul>{refs}</ul>
        </>
      );
    }
  }
  return (
    <div id="brainNote">
      <h1>{note.title}</h1>
      <MDXRenderer>{note.childMdx.body}</MDXRenderer>
      {referenceBlock}
      {externalRefBlock}
    </div>
  );
};

export default BrainNote;
