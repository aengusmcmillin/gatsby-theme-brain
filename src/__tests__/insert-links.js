import insertLinks from "../insert-links";

describe("insert-links", () => {
  describe("when linkifyHashtags is true", () => {
    it("replaces hashtags with target source", () => {
      let result = insertLinks("#Books", { books: "books" }, "testpath/", {
        linkifyHashtags: true,
        hideDoubleBrackets: false,
      });

      expect(result).toBe("[#Books](/testpath/books)");
    });
  });

  describe("when hideDoubleBrackets is true", () => {
    it("replaces bracketed links with target source without brackets", () => {
      let result = insertLinks("[[Books]]", { books: "books" }, "testpath/", {
        linkifyHashtags: false,
        hideDoubleBrackets: true,
      });

      expect(result).toBe("[Books](/testpath/books)");
    });
  });

  it("replaces bracketed links with target source", () => {
    let result = insertLinks("[[Books]]", { books: "books" }, "testpath/", {
      linkifyHashtags: false,
      hideDoubleBrackets: false,
    });

    expect(result).toBe("[[[Books]]](/testpath/books)");
  });
});
