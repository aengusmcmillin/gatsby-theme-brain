import React from "react";
import { graphql } from "gatsby";
import BrainNote from "../components/BrainNote";

export default (props) => {
  return <BrainNote note={props.data.brainNote} />;
};

export const query = graphql`
  query BrainNoteBySlug($slug: String!) {
    brainNote(slug: { eq: $slug }) {
      slug
      title
      externalInboundReferences {
        siteName
        sourcePage
        sourceUrl
        previewHtml
      }
      inboundReferences
      inboundReferencePreviews {
        source
        previewHtml
      }
      childMdx {
        body
      }
    }
  }
`;
