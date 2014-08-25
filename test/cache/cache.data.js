var _             = require("lodash");
var assert        = require("chai").assert;
var multiline     = require("multiline");

var Cache         = require("../../lib/cache").Cache;

var yml = multiline.stripIndent(function(){/*
- name: Parker Moore
  github: parkr

- name: Liu Fengyun
  github: liufengyun
 */});

describe("Adding data to the cache", function(){
    var _cache;
    beforeEach(function () {
        _cache    = new Cache();
    });
    it("Should add YML data", function(){
        var data = _cache.addData("_data/members.yml", yml, {}).data();
        assert.equal(data["data/members.yml"].length, 2);
    });
    it("Should add JSON data", function(){
        var data = _cache.addData("_data/animals.json", {name: "kittie"}, {}).data();
        assert.equal(data["data/animals.json"].name, "kittie");
    });
    it("Should convert keys to usage paths (obj)", function(){
        var obj = {};
        var data = _cache
            .addData("_data/animals.json", {
                name: "kittie",
                age: 6
            }, {})
            .convertKeys("data", obj);

        assert.equal(obj.animals.name, "kittie");
    });
    it("Should convert keys to usage paths (array)", function(){
        var obj = {};
        var data = _cache
            .addData("_data/animals.json", [{
                name: "White Catz"
            }], {})
            .convertKeys("data", obj);

        assert.equal(obj.animals[0].name, "White Catz");
    });
    it("Should convert keys with sub-dirs to usage paths", function(){
        var obj = {};
        var data = _cache
            .addData("_data/subdir/animals.json", {
                name: "kittie",
                age: 6
            }, {})
            .convertKeys("data", obj);

        assert.equal(data.subdir.animals.name, "kittie");
    });
    it("Should convert keys with sub-dirs to usage paths", function(){
        var obj = {};
        var data = _cache
            .addData("_data/subdir/animals.json", {
                name: "kittie",
                age: 6
            }, {})
            .convertKeys("data", obj);

        assert.equal(data.subdir.animals.name, "kittie");
    });
    it("Should convert keys with sub-dirs to usage paths", function(){
        var obj = {};
        var data = _cache
            .addData("_data/subdir/level2/animals.json", {
                name: "kittie",
                age: 6
            }, {})
            .convertKeys("data", obj);

        assert.equal(data.subdir.level2.animals.name, "kittie");
    });
});