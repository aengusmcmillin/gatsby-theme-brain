// import React from "react";
// import { graphql } from "gatsby";

// import GraphOverview from "../components/GraphOverview";

// export default (props) => {
//   const brainElements = buildGraphElements(props.data.brain.nodes);

//   return <GraphOverview elements={brainElements} />;
// };

// export const query = graphql`
//   query BrainGraph {
//     brain: allBrainNote {
//       nodes {
//         title
//         slug
//         inboundReferences
//         outboundReferences
//       }
//     }
//   }
// `;

// const buildGraphElements = (nodes) => {
//   const elements = [];

//   nodes.forEach(({ title, slug, inboundReferences, outboundReferences }) => {
//     elements.push({ data: { id: slug, label: title } });

//     const references = []
//       .concat(inboundReferences, outboundReferences)
//       .filter(Boolean);

//     references.forEach((reference, refIndex) => {
//       elements.push({
//         data: {
//           id: `${slug}_${reference}_${refIndex}`,
//           source: slug,
//           target: reference,
//         },
//       });
//     });
//   });

//   return elements;
// };
