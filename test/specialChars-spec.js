var should = require('should');
var specialChars = require('../dist/modules/specialChars');

describe('Module specialChars', function () {
  it('should be have property function escape()', function () {
    specialChars.should.be.have.property('escape');
    specialChars.escape.should.be.a.Function;
  });

  it('should be have property function unescape()', function () {
    specialChars.should.be.have.property('unescape');
    specialChars.unescape.should.be.a.Function;
  });

  it('should escape all needed characters', function () {

    var source = '{"subscriberId":"12345","entityTypesAndEvents":\n\r{"\\net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var expected = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n\\r{"\\\\net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var result = specialChars.escape(source);
    result.should.be.equal(expected);
  });

  it('should unescape all needed characters', function () {
    var source = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n{"net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var expected = '{"subscriberId":"12345","entityTypesAndEvents":\n{"net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var result = specialChars.unescape(source);
    result.should.be.equal(expected);
  });
});