import React from "react";
import renderer from "react-test-renderer";

import BrainNote from "../BrainNote";

describe("BrainNote", () => {
  it("renders correctly", () => {
    const tree = renderer
      .create(
        <BrainNote
          note={
            ("Test Note",
            {
              body: "",
            })
          }
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
