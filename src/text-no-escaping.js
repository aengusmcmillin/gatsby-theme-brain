module.exports = textNoEscaping;

function textNoEscaping() {
  var Compiler = this.Compiler;
  var visitors = Compiler.prototype.visitors;

  visitors.text = text;

  function text(node, parent) {
    return this.encode(node, node).value;
  }
}
