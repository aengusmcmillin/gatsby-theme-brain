import generateSlug from "../generate-slug";

describe("generate-slug", () => {
  it("returns the passed in value if it is an eligible slug", () => {
    expect(generateSlug("books")).toBe("books");
  });

  it("converts to lowercase", () => {
    expect(generateSlug("UpPeRcAsEtEsT")).toBe("uppercasetest");
  });

  it("replaces underscores with dashes", () => {
    expect(generateSlug("test_post")).toBe("test-post");
  });

  it("replaces spaces with dashes", () => {
    expect(generateSlug("test post 123")).toBe("test-post-123");
    expect(generateSlug("test     post   123")).toBe("test-post-123");
  });
});
