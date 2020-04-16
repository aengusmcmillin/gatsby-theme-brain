import React from "react";
import MDXRenderer from "gatsby-plugin-mdx/mdx-renderer";

const BrainNote = ({ note }) => {
  let references = [];
  let referenceBlock;
  if (note.inboundReferences != null) {
    references = note.inboundReferences.map((ref) => (
      <li>
        <a href={ref}>{ref}</a>
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
  return (
    <div id="brainNote">
      <h1>{note.title}</h1>
      <MDXRenderer>{note.childMdx.body}</MDXRenderer>
      {referenceBlock}
    </div>
  );
};

export default BrainNote;
