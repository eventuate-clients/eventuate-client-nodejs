var should = require('should');
var specialChars = require('../dist/modules/specialChars');

describe('Module specialChars', function () {
  it('should be have property function escapeStr()', function () {
    specialChars.should.be.have.property('escapeStr');
    specialChars.escapeStr.should.be.a.Function;
  });

  it('should be have property function unEscapeStr()', function () {
    specialChars.should.be.have.property('unEscapeStr');
    specialChars.unEscapeStr.should.be.a.Function;
  });

  it('should escapeStr all needed characters', function () {

    var source = '{"subscriberId":"12345","entityTypesAndEvents":\n\r{"\\net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var expected = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n\\r{"\\\\net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var result = specialChars.escapeStr(source);
    result.should.be.equal(expected);
  });

  it('should unEscapeStr all needed characters', function () {
    var source = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n{"net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var expected = '{"subscriberId":"12345","entityTypesAndEvents":\n{"net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    var result = specialChars.unEscapeStr(source);
    result.should.be.equal(expected);
  });
});