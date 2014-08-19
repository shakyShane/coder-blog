var _             = require("lodash");
var assert        = require("chai").assert;
var multiline     = require("multiline");

var Cache   = require("../../lib/cache").Cache;
var Partial = require("../../lib/partial").Partial;

describe("Adding Partials to the Cache", function(){
    var _cache;
    beforeEach(function () {
        _cache    = new Cache();
    });
    it("Should add an item", function(){
        var partial = new Partial("_snippets/function.js", "content");
        var cache   = _cache.addPartial(partial);
        assert.equal(cache.partials().length, 1);
    });
    it("retrieve items from a given key", function(){

        var partial1 = new Partial("_snippets/function.js", "content");
        var partial2 = new Partial("_snippets/styles.css", "CSS content");

        var item     = _cache.addPartial([partial1, partial2]).find("styles");
        assert.equal(item.content, "CSS content");
    });
});