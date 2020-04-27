// import React from "react";
// import CytoscapeComponent from "react-cytoscapejs";
// import { navigate } from "gatsby";

// const GraphOverview = ({ elements, layout, style, stylesheet, ...props }) => {
//   return (
//     <CytoscapeComponent
//       elements={elements}
//       layout={{ name: "breadthfirst", padding: 40, ...layout }}
//       style={{ width: "1000px", height: "600px", ...style }}
//       stylesheet={[
//         {
//           selector: "node",
//           style: {
//             label: "data(label)",
//             color: "#000000",
//             backgroundColor: "#545454",
//             "text-wrap": "wrap",
//             "text-max-width": 100,
//             "font-size": 12,
//           },
//         },
//         {
//           selector: "node.selected",
//           style: {
//             backgroundColor: "#32abdf",
//           },
//         },
//         {
//           selector: "edge",
//           style: {
//             "line-color": "#b7b7b7",
//           },
//         },
//         {
//           selector: "edge.selected",
//           style: {
//             "line-color": "#32abdf",
//           },
//         },
//         ...stylesheet,
//       ]}
//       cy={(cy) => {
//         cy.nodes().on("click", function (e) {
//           const node = e.target;
//           const selectedClass = "selected";

//           if (node.hasClass(selectedClass)) {
//             navigate(node.id());
//             return;
//           }

//           cy.elements().removeClass(selectedClass);

//           node.addClass(selectedClass);
//           node.connectedEdges().addClass(selectedClass);
//         });
//       }}
//       {...props}
//     />
//   );
// };

// export default GraphOverview;
