import React from "react";
import MDXRenderer from "gatsby-plugin-mdx/mdx-renderer";

const BrainNote = ({ note }) => {
  let references = [];
  let referenceBlock;
  if (note.inboundReferences != null) {
    references = note.inboundReferences.map((ref) => <a href={ref}>{ref}</a>);

    if (references.length > 0) {
      referenceBlock = (
        <>
          <h2>Linked References</h2>
          {references}
        </>
      );
    }
  }
  return (
    <div id="brainNote">
      <h1>{note.title}</h1>
      <MDXRenderer>{note.childMdx.body}</MDXRenderer>
      {referenceBlock}
    </div>
  );
};

export default BrainNote;
